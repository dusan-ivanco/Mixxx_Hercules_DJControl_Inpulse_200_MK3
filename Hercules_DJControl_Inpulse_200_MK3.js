// Hercules DJControl Inpulse 200 MK3 – skript pre Mixxx, verzia 1.0
// Popis funkcií, nastavení a MIDI kódov: Hercules_DJControl_Inpulse_200_MK3.md

var DJCi200mk3 = {};

// === NASTAVENIA – tu sa dá meniť správanie bez zásahu do kódu ===

DJCi200mk3.scratchScale = 1.0;          // rýchlosť scratchu
DJCi200mk3.scratchShiftMultiplier = 4;  // SHIFT + jog: koľkokrát rýchlejšie sa posúva v skladbe
DJCi200mk3.bendScale = 1.0;             // sila pitch bendu (doladenie tempa jogom)
DJCi200mk3.effectMeta = 0.6;            // počiatočná hodnota hlavného parametra (meta) každého efektu
DJCi200mk3.vinylOnStartup = true;       // či je po spustení zapnutý režim Vinyl (scratch)
DJCi200mk3.brakeFactor = 1.0;           // Brake: vyššie číslo = rýchlejšie zastavenie
DJCi200mk3.spinbackFactor = 1.8;        // Spinback: vyššie číslo = dlhšie pretočenie dozadu
DJCi200mk3.guideTempoTolerance = 0.1;   // Guide: rozdiel BPM, ktorý sa už považuje za zhodné tempo
DJCi200mk3.guidePhaseTolerance = 0.03;  // Guide: odchýlka dôb (časť doby), ktorá sa považuje za zarovnané
DJCi200mk3.guideTempoInvert = true;     // Guide: otočenie šípok Tempo (true = overené na tomto ovládači)
DJCi200mk3.pickupThreshold = 0.03;      // zdieľané gombíky: ako blízko (0–1) musí byť gombík, aby hodnotu „chytil“
DJCi200mk3.browseFastStep = 10;         // SHIFT + gombík prehliadača: o koľko skladieb naraz

// === KONŠTANTY A STAV ===

// Čo práve robí jog wheel
DJCi200mk3.ACTION_NONE = 0;     // nič (jog sa nedotýka)
DJCi200mk3.ACTION_SCRATCH = 1;  // scratch
DJCi200mk3.ACTION_SEEK = 2;     // rýchle posúvanie (SHIFT)
DJCi200mk3.ACTION_BEND = 3;     // doladenie tempa počas hrania

DJCi200mk3.SHIFT_STATUS = {1: 0x94, 2: 0x95};  // MIDI kanál SHIFT vrstvy decku A / B
DJCi200mk3.VINYL_LED = 0x03;                   // LED Vinyl (na SHIFT vrstve tlačidla Loop)
DJCi200mk3.BROWSER_LED = 0x04;                 // LED tlačidla prehliadača
DJCi200mk3.MASTER_BUTTON_LED = 0x02;           // LED tlačidla MASTER (kanál 0x90)
DJCi200mk3.DECK_STATUS = {1: 0x91, 2: 0x92};   // MIDI kanál tlačidiel / LED decku A / B
// Šípky Beatmatch Guide na každom decku (kód LED, rovnaký pre deck A aj B)
DJCi200mk3.ARROW = {
    alignBack: 0x21,     // Beat Align, šípka vľavo pod jogom: pootočiť jog dozadu (deck je vpredu)
    alignForward: 0x22,  // Beat Align, šípka vpravo pod jogom: pootočiť jog dopredu (deck mešká)
    tempoDown: 0x23,     // Tempo, šípka dole: posunúť pitch fader dole
    tempoUp: 0x24,       // Tempo, šípka hore: posunúť pitch fader hore
};

DJCi200mk3.vinylMode = {1: true, 2: true};
DJCi200mk3.scratchAction = {1: DJCi200mk3.ACTION_NONE, 2: DJCi200mk3.ACTION_NONE};
DJCi200mk3.loopInSet = {1: false, 2: false};  // tlačidlo Loop: začiatok slučky je nastavený
DJCi200mk3.guideTimer = 0;
DJCi200mk3.ledCache = {};  // posledný stav šípok – posiela sa len zmena

// === ŠTART A UKONČENIE ===

DJCi200mk3.init = function() {
    for (const deck of [1, 2]) {
        DJCi200mk3.vinylMode[deck] = DJCi200mk3.vinylOnStartup;
        DJCi200mk3.scratchAction[deck] = DJCi200mk3.ACTION_NONE;
        DJCi200mk3._setVinylLed(deck);
    }

    midi.sendShortMsg(0x90, DJCi200mk3.BROWSER_LED, 0x05);  // LED prehliadača svieti (modrá)

    // Efekty: hlavný parameter všetkých slotov a plná intenzita (mix) oboch FX jednotiek
    for (const unit of [1, 2]) {
        for (const slot of [1, 2, 3]) {
            engine.setParameter(`[EffectRack1_EffectUnit${unit}_Effect${slot}]`, "meta", DJCi200mk3.effectMeta);
        }
        engine.setParameter(`[EffectRack1_EffectUnit${unit}]`, "mix", 1);
    }

    // Tlačidlo MASTER: LED podľa toho, či je mix v slúchadlách
    engine.makeConnection("[Master]", "headMix", DJCi200mk3._updateMasterLed);
    DJCi200mk3._updateMasterLed(engine.getValue("[Master]", "headMix"));

    // Beatmatch Guide: šípky sa prepočítavajú 20× za sekundu
    DJCi200mk3.guideTimer = engine.beginTimer(50, DJCi200mk3._updateGuide);

    // Požiada ovládač, aby poslal aktuálnu polohu všetkých gombíkov a faderov
    midi.sendShortMsg(0xB0, 0x7F, 0x7F);
};

DJCi200mk3.shutdown = function() {
    if (DJCi200mk3.guideTimer) {
        engine.stopTimer(DJCi200mk3.guideTimer);
        DJCi200mk3.guideTimer = 0;
    }
    for (const deck of [1, 2]) {
        for (const name in DJCi200mk3.ARROW) {
            midi.sendShortMsg(DJCi200mk3.DECK_STATUS[deck], DJCi200mk3.ARROW[name], 0x00);
        }
        midi.sendShortMsg(DJCi200mk3.SHIFT_STATUS[deck], DJCi200mk3.VINYL_LED, 0x00);
    }
    midi.sendShortMsg(0x90, DJCi200mk3.MASTER_BUTTON_LED, 0x00);
    midi.sendShortMsg(0xB0, 0x7F, 0x7E);
    midi.sendShortMsg(0x90, DJCi200mk3.BROWSER_LED, 0x00);
};

// === POMOCNÉ FUNKCIE ===

// Číslo decku podľa MIDI kanála: 0x91/0x94/0xB1/0xB4 → 1, 0x92/0x95/0xB2/0xB5 → 2
DJCi200mk3._deck = function(status) {
    const ch = status & 0x0F;
    return (ch === 1 || ch === 4) ? 1 : 2;
};

// Číslo decku podľa skupiny: "[Channel2]" → 2
DJCi200mk3._deckFromGroup = function(group) {
    return parseInt(group.substring(8, group.length - 1), 10);
};

DJCi200mk3._setVinylLed = function(deck) {
    midi.sendShortMsg(DJCi200mk3.SHIFT_STATUS[deck], DJCi200mk3.VINYL_LED, DJCi200mk3.vinylMode[deck] ? 0x7F : 0x00);
};

// Relatívna hodnota jogu / gombíka: 0x01–0x3F = +, 0x41–0x7F = −
DJCi200mk3._relative = function(value) {
    return value < 0x40 ? value : value - 0x80;
};

DJCi200mk3._scratchEnable = function(deck) {
    const alpha = 1.0 / 8;
    engine.scratchEnable(deck, 248, 33 + 1 / 3, alpha, alpha / 32);
};

// Dotyk / pustenie vrchnej plochy jogu
DJCi200mk3._touch = function(deck, touched, action) {
    if (touched) {
        if (action !== DJCi200mk3.ACTION_BEND) {
            DJCi200mk3._scratchEnable(deck);
        }
        DJCi200mk3.scratchAction[deck] = action;
    } else {
        engine.scratchDisable(deck);
        DJCi200mk3.scratchAction[deck] = DJCi200mk3.ACTION_NONE;
    }
};

// === JOG WHEEL A VINYL ===

// SHIFT + Loop: zapne / vypne režim Vinyl (scratch) pre daný deck
DJCi200mk3.vinylButton = function(_channel, _control, value, status, _group) {
    if (!value) { return; }
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3.vinylMode[deck] = !DJCi200mk3.vinylMode[deck];
    DJCi200mk3._setVinylLed(deck);
};

// Dotyk jogu: scratch, ak je zapnutý Vinyl alebo deck stojí; inak doladenie tempa
DJCi200mk3.wheelTouch = function(_channel, _control, value, status, group) {
    const deck = DJCi200mk3._deck(status);
    const scratch = DJCi200mk3.vinylMode[deck] || !engine.getValue(group, "play");
    DJCi200mk3._touch(deck, value > 0, scratch ? DJCi200mk3.ACTION_SCRATCH : DJCi200mk3.ACTION_BEND);
};

// SHIFT + dotyk jogu: rýchle posúvanie v skladbe
DJCi200mk3.wheelTouchShift = function(_channel, _control, value, status, _group) {
    DJCi200mk3._touch(DJCi200mk3._deck(status), value > 0, DJCi200mk3.ACTION_SEEK);
};

// Otáčanie vrchnej plochy jogu (bez SHIFT aj so SHIFT)
DJCi200mk3.scratchWheel = function(_channel, _control, value, status, group) {
    const deck = DJCi200mk3._deck(status);
    const dir = DJCi200mk3._relative(value);
    switch (DJCi200mk3.scratchAction[deck]) {
    case DJCi200mk3.ACTION_SCRATCH:
        engine.scratchTick(deck, dir * DJCi200mk3.scratchScale);
        break;
    case DJCi200mk3.ACTION_SEEK:
        engine.scratchTick(deck, dir * DJCi200mk3.scratchScale * DJCi200mk3.scratchShiftMultiplier);
        break;
    default:
        engine.setValue(group, "jog", dir * DJCi200mk3.bendScale);
    }
};

// Otáčanie okraja jogu: doladenie tempa (pitch bend)
DJCi200mk3.bendWheel = function(_channel, _control, value, _status, group) {
    engine.setValue(group, "jog", DJCi200mk3._relative(value) * DJCi200mk3.bendScale);
};

// === TLAČIDLO LOOP – MANUÁLNA SLUČKA ===

DJCi200mk3._press = function(group, key) {
    engine.setValue(group, key, 1);
    engine.setValue(group, key, 0);
};

DJCi200mk3.loopButton = function(_channel, _control, value, _status, group) {
    if (!value) { return; }
    const deck = DJCi200mk3._deckFromGroup(group);
    if (engine.getValue(group, "loop_enabled")) {
        DJCi200mk3._press(group, "reloop_toggle");
        DJCi200mk3.loopInSet[deck] = false;
    } else if (!DJCi200mk3.loopInSet[deck] || engine.getValue(group, "loop_start_position") < 0) {
        DJCi200mk3._press(group, "loop_in");
        DJCi200mk3.loopInSet[deck] = true;
    } else {
        DJCi200mk3._press(group, "loop_out");
        DJCi200mk3.loopInSet[deck] = false;
    }
};

// === SHIFT + STEMS – SKRÁTIŤ / PREDĹŽIŤ SLUČKU ===

DJCi200mk3._resizeLoop = function(group, factor) {
    const start = engine.getValue(group, "loop_start_position");
    const end = engine.getValue(group, "loop_end_position");
    if (!engine.getValue(group, "loop_enabled") || start < 0 || end <= start) {
        DJCi200mk3._press(group, factor < 1 ? "loop_halve" : "loop_double");
        return;
    }
    const newEnd = start + (end - start) * factor;
    const trackEnd = engine.getValue(group, "track_samples");
    if (factor > 1 && trackEnd > 0 && newEnd > trackEnd) { return; }  // nepresiahnuť koniec skladby
    if (newEnd - start < 2) { return; }                                   // príliš krátka slučka
    engine.setValue(group, "loop_end_position", newEnd);
};

DJCi200mk3.loopHalve = function(_channel, _control, value, _status, group) {
    if (value) { DJCi200mk3._resizeLoop(group, 0.5); }
};

DJCi200mk3.loopDouble = function(_channel, _control, value, _status, group) {
    if (value) { DJCi200mk3._resizeLoop(group, 2); }
};

// === TLAČIDLÁ STEMS → BRAKE / SPINBACK ===

// Ľavé tlačidlo Stems: skladba sa zabrzdí až do zastavenia (ako vypnutý gramofón)
DJCi200mk3.brakeButton = function(_channel, _control, value, _status, group) {
    if (!value || !engine.getValue(group, "play")) { return; }
    engine.brake(DJCi200mk3._deckFromGroup(group), true, DJCi200mk3.brakeFactor);
};

// Pravé tlačidlo Stems: kým je stlačené, platňa sa točí dozadu; po pustení hrá ďalej
DJCi200mk3.spinbackButton = function(_channel, _control, value, _status, group) {
    engine.spinback(DJCi200mk3._deckFromGroup(group), value > 0, DJCi200mk3.spinbackFactor);
};

// === ZDIEĽANÉ GOMBÍKY S PICKUPOM (GAIN/HIGH, FILTER, LOW, MID) ===

// Stav pre každý deck a fyzický gombík: posledná poloha, „chytené“ hodnoty
DJCi200mk3.knob = {1: {}, 2: {}};

// MIDI hodnota 0–127 → rozsah 0–1 (stred 64 = presne 0,5)
DJCi200mk3._midiToParam = function(value) {
    return value === 64 ? 0.5 : value / 127;
};

// knobName = fyzický gombík, which / other = jeho dve funkcie,
// snap = zaokrúhliť výslednú hodnotu na celé čísla (tónina po poltónoch)
DJCi200mk3._pickup = function(deck, knobName, which, other, group, key, value, snap) {
    if (!DJCi200mk3.knob[deck][knobName]) {
        DJCi200mk3.knob[deck][knobName] = {pos: null, locked: {}, lastSet: {}};
    }
    const k = DJCi200mk3.knob[deck][knobName];
    const knobPos = DJCi200mk3._midiToParam(value);
    const current = engine.getParameter(group, key);

    k.locked[other] = false;  // druhú funkciu bude treba znova „chytiť“

    // Hodnotu medzitým zmenilo niečo iné (myš, iný ovládač) → pustiť
    if (k.locked[which] && Math.abs(current - k.lastSet[which]) > DJCi200mk3.pickupThreshold / 3) {
        k.locked[which] = false;
    }

    if (!k.locked[which]) {
        const near = Math.abs(knobPos - current) <= DJCi200mk3.pickupThreshold;
        const crossed = k.pos !== null && (k.pos - current) * (knobPos - current) <= 0;
        k.locked[which] = near || crossed;
    }
    k.pos = knobPos;

    if (k.locked[which]) {
        engine.setParameter(group, key, knobPos);
        if (snap) {
            engine.setValue(group, key, Math.round(engine.getValue(group, key)));
        }
        k.lastSet[which] = engine.getParameter(group, key);
    }
};

// Gombík Gain/High bez SHIFT: výšky (EQ High)
DJCi200mk3.highKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "gainHigh", "high", "gain", `[EqualizerRack1_[Channel${deck}]_Effect1]`, "parameter3", value);
};

// Gombík Gain/High so SHIFT: Gain (zosilnenie vstupu)
DJCi200mk3.gainKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "gainHigh", "gain", "high", `[Channel${deck}]`, "pregain", value);
};

// Gombík Filter bez SHIFT: filter (dolná / horná priepusť)
DJCi200mk3.filterKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "filter", "filter", "fx", `[QuickEffectRack1_[Channel${deck}]]`, "super1", value);
};

// Gombík Filter so SHIFT: intenzita efektov (dry/wet) FX jednotky decku (deck A = FX1, deck B = FX2)
DJCi200mk3.fxMixKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "filter", "fx", "filter", `[EffectRack1_EffectUnit${deck}]`, "mix", value);
};

// Gombík Low bez SHIFT: basy (EQ Low)
DJCi200mk3.lowKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "low", "low", "fxSuper", `[EqualizerRack1_[Channel${deck}]_Effect1]`, "parameter1", value);
};

// Gombík Low so SHIFT: charakter efektov (super knob) FX jednotky decku
DJCi200mk3.fxSuperKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "low", "fxSuper", "low", `[EffectRack1_EffectUnit${deck}]`, "super1", value);
};

// Gombík Mid bez SHIFT: stredy (EQ Mid)
DJCi200mk3.midKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "mid", "mid", "key", `[EqualizerRack1_[Channel${deck}]_Effect1]`, "parameter2", value);
};

// Gombík Mid so SHIFT: tónina skladby, po celých poltónoch (stred = pôvodná tónina)
DJCi200mk3.keyKnob = function(_channel, _control, value, status, _group) {
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3._pickup(deck, "mid", "key", "mid", `[Channel${deck}]`, "pitch_adjust", value, true);
};

// === SHIFT + GOMBÍK PREHLIADAČA – RÝCHLE LISTOVANIE ===

DJCi200mk3.browseFast = function(_channel, _control, value, _status, _group) {
    const steps = DJCi200mk3._relative(value);
    engine.setValue("[Library]", "MoveVertical", steps * DJCi200mk3.browseFastStep);
};

// === TLAČIDLO MASTER – CELÝ MIX DO SLÚCHADIEL ===

DJCi200mk3.masterButton = function(_channel, _control, value, _status, _group) {
    if (!value) { return; }
    const on = engine.getValue("[Master]", "headMix") > -0.9;
    engine.setValue("[Master]", "headMix", on ? -1 : 0);
};

DJCi200mk3._updateMasterLed = function(headMix) {
    midi.sendShortMsg(0x90, DJCi200mk3.MASTER_BUTTON_LED, headMix > -0.9 ? 0x7F : 0x00);
};

// === BEATMATCH GUIDE – ŠÍPKY TEMPO A BEAT ALIGN ===

DJCi200mk3.guideButton = function(_channel, _control, _value, _status, _group) {
    engine.beginTimer(300, function() { DJCi200mk3.ledCache = {}; }, true);
};

DJCi200mk3._arrow = function(deck, name, on) {
    const id = deck + name;
    if (DJCi200mk3.ledCache[id] === on) { return; }
    DJCi200mk3.ledCache[id] = on;
    midi.sendShortMsg(DJCi200mk3.DECK_STATUS[deck], DJCi200mk3.ARROW[name], on ? 0x7F : 0x00);
};

DJCi200mk3._updateGuide = function() {
    for (const deck of [1, 2]) {
        const group = `[Channel${deck}]`;
        const other = `[Channel${3 - deck}]`;
        let slower = false, faster = false, back = false, forward = false;

        if (!engine.getValue(other, "play")) {
            back = forward = engine.getValue(group, "end_of_track") > 0;
        } else if (engine.getValue(group, "track_loaded")) {
            const bpm = engine.getValue(group, "bpm");
            const otherBpm = engine.getValue(other, "bpm");
            if (bpm > 0 && otherBpm > 0) {
                const diff = bpm - otherBpm;
                slower = diff > DJCi200mk3.guideTempoTolerance;
                faster = diff < -DJCi200mk3.guideTempoTolerance;

                // Beat Align má zmysel iba pri zhodnom tempe a keď hrajú oba decky
                if (!slower && !faster && engine.getValue(group, "play")) {
                    let phase = engine.getValue(group, "beat_distance") - engine.getValue(other, "beat_distance");
                    if (phase > 0.5) { phase -= 1; }
                    if (phase < -0.5) { phase += 1; }
                    back = phase > DJCi200mk3.guidePhaseTolerance;
                    forward = phase < -DJCi200mk3.guidePhaseTolerance;
                }
            }
        }
        // Ktorým smerom fadera sa zrýchľuje, závisí od nastavenia Mixxx (rate_dir)
        let upIsFaster = engine.getValue(group, "rate_dir") >= 0;
        if (DJCi200mk3.guideTempoInvert) { upIsFaster = !upIsFaster; }
        DJCi200mk3._arrow(deck, "tempoUp", upIsFaster ? faster : slower);
        DJCi200mk3._arrow(deck, "tempoDown", upIsFaster ? slower : faster);
        DJCi200mk3._arrow(deck, "alignBack", back);
        DJCi200mk3._arrow(deck, "alignForward", forward);
    }
};
