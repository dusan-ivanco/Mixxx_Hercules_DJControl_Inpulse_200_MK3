// Hercules DJControl Inpulse 200 MK3 – Mixxx script
// Based on the Inpulse 200 MK2 mapping by DJ Phatso and Kerrick Staley.
// User documentation: https://manual.mixxx.org/latest/en/hardware/controllers/hercules_djcontrol_inpulse_200_mk3.html
// MIDI messages are listed at the top of Hercules-DJControl-Inpulse-200-MK3.midi.xml.

// Must be "var": Mixxx looks up init/shutdown as a property of the global object, which const/let do not create
// eslint-disable-next-line no-var
var DJCi200mk3 = {};

// === SETTINGS – Preferences → Controllers → this mapping (defined in <settings> in the XML) ===

DJCi200mk3.vinylOnStartup = engine.getSetting("vinylOnStartup") ?? true;
DJCi200mk3.scratchScale = engine.getSetting("scratchScale") ?? 1.0;
DJCi200mk3.scratchShiftMultiplier = engine.getSetting("scratchShiftMultiplier") ?? 4;
DJCi200mk3.bendScale = engine.getSetting("bendScale") ?? 1.0;
DJCi200mk3.useStems = engine.getSetting("useStems") ?? true;
DJCi200mk3.vocalsStem = engine.getSetting("vocalsStem") ?? 4;
DJCi200mk3.brakeFactor = engine.getSetting("brakeFactor") ?? 1.0;
DJCi200mk3.spinbackFactor = engine.getSetting("spinbackFactor") ?? 1.8;
DJCi200mk3.guideTempoTolerance = engine.getSetting("guideTempoTolerance") ?? 0.1;
DJCi200mk3.guidePhaseTolerance = engine.getSetting("guidePhaseTolerance") ?? 0.03;
DJCi200mk3.browseFastStep = engine.getSetting("browseFastStep") ?? 10;

// === CONSTANTS AND STATE ===

DJCi200mk3.PICKUP_THRESHOLD = 0.03;  // shared knobs: how close (0–1) the knob must be to "catch" the value
DJCi200mk3.LOOP_RESIZE_TICKS = 64;  // SHIFT + jog ring: ticks per halving / doubling of the loop
// Beatloop sizes Mixxx has beatloop_X_enabled controls for
DJCi200mk3.BEATLOOP_SIZES = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512];

// What the jog wheel is currently doing
DJCi200mk3.ACTION_NONE = 0;     // nothing (jog not touched)
DJCi200mk3.ACTION_SCRATCH = 1;  // scratch
DJCi200mk3.ACTION_SEEK = 2;     // fast seek (SHIFT)
DJCi200mk3.ACTION_BEND = 3;     // tempo nudge while playing

DJCi200mk3.SHIFT_STATUS = {1: 0x94, 2: 0x95};  // MIDI status byte of the SHIFT layer of deck A / B
DJCi200mk3.VINYL_LED = 0x03;                   // Vinyl LED (on the SHIFT layer of the Loop button)
DJCi200mk3.BROWSER_LED = 0x04;                 // browser button LED
DJCi200mk3.DECK_STATUS = {1: 0x91, 2: 0x92};   // MIDI status byte of the buttons / LEDs of deck A / B
// Beatmatch Guide arrows on each deck (LED code, same for deck A and B)
DJCi200mk3.ARROW = {
    alignBack: 0x21,     // Beat Align, left arrow below the jog: turn the jog backward (deck is ahead)
    alignForward: 0x22,  // Beat Align, right arrow below the jog: turn the jog forward (deck is behind)
    tempoDown: 0x23,     // Tempo, down arrow: move the pitch fader down
    tempoUp: 0x24,       // Tempo, up arrow: move the pitch fader up
};

DJCi200mk3.vinylMode = {1: true, 2: true};
DJCi200mk3.scratchAction = {1: DJCi200mk3.ACTION_NONE, 2: DJCi200mk3.ACTION_NONE};
DJCi200mk3.loopIn = {1: -1, 2: -1};  // Loop button: loop start position it has set, -1 = none
DJCi200mk3.spinbackHeld = {1: false, 2: false};  // a right Stems button is holding a Spinback
DJCi200mk3.brakeStarted = {1: false, 2: false};  // Brake / Spinback started by the mapping (may still be running)
DJCi200mk3.loopResizeTicks = {1: 0, 2: 0};  // SHIFT + jog ring: ticks turned since the last loop change
// State per deck and physical knob: last position, "caught" values
DJCi200mk3.knob = {1: {}, 2: {}};
DJCi200mk3.guideTimer = 0;
DJCi200mk3.ledCache = {};  // last arrow state – only changes are sent
DJCi200mk3.stemsAvailable = false;  // Mixxx supports stems (2.6+), detected in init
DJCi200mk3.startupSync = false;  // true right after init: knob positions sent by the controller are taken over directly
DJCi200mk3.pitchMsb = {1: 0x40, 2: 0x40};  // pitch fader: upper 7 bits, completed by the LSB message

// === STARTUP AND SHUTDOWN ===

DJCi200mk3.init = function() {
    for (const deck of [1, 2]) {
        DJCi200mk3.vinylMode[deck] = DJCi200mk3.vinylOnStartup;
        DJCi200mk3.scratchAction[deck] = DJCi200mk3.ACTION_NONE;
        DJCi200mk3._setVinylLed(deck);
    }

    // Beatmatch Guide: arrows are recalculated 20× per second
    DJCi200mk3.guideTimer = engine.beginTimer(50, DJCi200mk3._updateGuide);

    // Ask the controller to send the current position of all knobs and faders. Pickup and soft takeover would
    // ignore these first values, so for a moment they are taken over directly
    DJCi200mk3.startupSync = true;
    midi.sendShortMsg(0xB0, 0x7F, 0x7F);
    engine.beginTimer(500, function() {
        DJCi200mk3.startupSync = false;
        engine.softTakeover("[Channel1]", "rate", true);
        engine.softTakeover("[Channel2]", "rate", true);
    }, true);

    // Stem controls exist only in Mixxx 2.6 and newer: on 2.5 the Stems buttons work as Brake / Spinback.
    // Mixxx 2.5 logs one warning about the unknown control (with --controller-abort-on-warning the mapping stops)
    DJCi200mk3.stemsAvailable = DJCi200mk3._controlExists("[Channel1]", "stem_count");
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
    midi.sendShortMsg(0xB0, 0x7F, 0x7E);  // shutdown message, also sent by the Inpulse 200 / 500 mappings
    midi.sendShortMsg(0x90, DJCi200mk3.BROWSER_LED, 0x00);
};

// === GLOBAL CONTROLS ===

// SHIFT + browser encoder: fast scrolling
DJCi200mk3.browseFast = function(_channel, _control, value, _status, _group) {
    const steps = DJCi200mk3._relative(value);
    engine.setValue("[Library]", "MoveVertical", steps * DJCi200mk3.browseFastStep);
};

// === DECK BUTTONS ===

// Loop button: manual loop
DJCi200mk3.loopButton = function(_channel, _control, value, _status, group) {
    if (!value) {
        return;
    }
    const deck = DJCi200mk3._deckFromGroup(group);
    if (engine.getValue(group, "loop_enabled")) {
        DJCi200mk3._press(group, "reloop_toggle");
        DJCi200mk3.loopIn[deck] = -1;
        return;
    }
    // Loop out only if the loop start is still the one set by this button (not by a beatloop or hot cue meanwhile)
    if (DJCi200mk3.loopIn[deck] >= 0 && engine.getValue(group, "loop_start_position") === DJCi200mk3.loopIn[deck]) {
        DJCi200mk3._press(group, "loop_out");
        if (engine.getValue(group, "loop_enabled")) {
            DJCi200mk3.loopIn[deck] = -1;
            return;
        }
        // Mixxx ignores a loop out before the loop in (e.g. after seeking back): set a new loop in here instead
    }
    // Forget the end of a previous loop, otherwise loop_in would start a loop to that old end right away
    engine.setValue(group, "loop_end_position", -1);
    DJCi200mk3._press(group, "loop_in");
    DJCi200mk3.loopIn[deck] = engine.getValue(group, "loop_start_position");
};

// SHIFT + Loop: toggles Vinyl (scratch) mode for the deck
DJCi200mk3.vinylButton = function(_channel, _control, value, status, _group) {
    if (!value) {
        return;
    }
    const deck = DJCi200mk3._deck(status);
    DJCi200mk3.vinylMode[deck] = !DJCi200mk3.vinylMode[deck];
    DJCi200mk3._setVinylLed(deck);
};

// Stems buttons: on a stem track (Mixxx 2.6+) left = instrumental only, right = vocals only (press again = all stems);
// otherwise Brake / Spinback, the same as with SHIFT
DJCi200mk3.stemsLeftButton = function(channel, control, value, status, group) {
    if (DJCi200mk3._stemsActive(group)) {
        if (value) {
            DJCi200mk3._toggleStems(group, false);
        }
        return;
    }
    DJCi200mk3.brakeButton(channel, control, value, status, group);
};

DJCi200mk3.stemsRightButton = function(channel, control, value, status, group) {
    // A release always ends a held Spinback, also when SHIFT was pressed or released meanwhile
    if (DJCi200mk3._stemsActive(group) && (value || !DJCi200mk3.spinbackHeld[DJCi200mk3._deckFromGroup(group)])) {
        if (value) {
            DJCi200mk3._toggleStems(group, true);
        }
        return;
    }
    DJCi200mk3.spinbackButton(channel, control, value, status, group);
};

// SHIFT + left Stems button: Brake – the track brakes to a stop (like a turntable switched off)
DJCi200mk3.brakeButton = function(_channel, _control, value, _status, group) {
    const deck = DJCi200mk3._deckFromGroup(group);
    if (!value || !engine.getValue(group, "play") || DJCi200mk3._jogHeld(deck)) {
        return;
    }
    DJCi200mk3.brakeStarted[deck] = true;
    engine.brake(deck, true, DJCi200mk3.brakeFactor);
};

// SHIFT + right Stems button: Spinback – while held, the record spins backward; on release it plays on
DJCi200mk3.spinbackButton = function(_channel, _control, value, _status, group) {
    const deck = DJCi200mk3._deckFromGroup(group);
    if (value) {
        if (!engine.getValue(group, "play") || DJCi200mk3._jogHeld(deck)) {
            return;
        }
        DJCi200mk3.spinbackHeld[deck] = true;
        DJCi200mk3.brakeStarted[deck] = true;
        engine.spinback(deck, true, DJCi200mk3.spinbackFactor);
    } else if (DJCi200mk3.spinbackHeld[deck]) {  // release: only end a Spinback this button started
        DJCi200mk3.spinbackHeld[deck] = false;
        DJCi200mk3.brakeStarted[deck] = false;
        engine.spinback(deck, false);
    }
};

// Brake / Spinback are ignored while the jog wheel is held for scratching or seeking
DJCi200mk3._jogHeld = function(deck) {
    const action = DJCi200mk3.scratchAction[deck];
    return action === DJCi200mk3.ACTION_SCRATCH || action === DJCi200mk3.ACTION_SEEK;
};

DJCi200mk3._setVinylLed = function(deck) {
    midi.sendShortMsg(DJCi200mk3.SHIFT_STATUS[deck], DJCi200mk3.VINYL_LED, DJCi200mk3.vinylMode[deck] ? 0x7F : 0x00);
};

// SHIFT + jog ring: halve (left) / double (right) the active loop, also a manual one, once per LOOP_RESIZE_TICKS
// (Mixxx ignores a loop that would be too short or reach past the end of the track)
DJCi200mk3.loopResizeWheel = function(_channel, _control, value, _status, group) {
    const deck = DJCi200mk3._deckFromGroup(group);
    const ticks = DJCi200mk3._relative(value);
    if (!engine.getValue(group, "loop_enabled")) {
        DJCi200mk3.loopResizeTicks[deck] = 0;
        return;
    }
    let total = DJCi200mk3.loopResizeTicks[deck];
    total = Math.sign(total) === -Math.sign(ticks) ? ticks : total + ticks;  // direction changed: start again
    if (Math.abs(total) >= DJCi200mk3.LOOP_RESIZE_TICKS) {
        if (DJCi200mk3.BEATLOOP_SIZES.some(size => engine.getValue(group, `beatloop_${size}_enabled`))) {
            // Beatloop (e.g. from a pad): resize through the beatloop size, so its pad LED and toggle keep working
            DJCi200mk3._press(group, total > 0 ? "loop_double" : "loop_halve");
        } else {
            engine.setValue(group, "loop_scale", total > 0 ? 2 : 0.5);
        }
        total = 0;
    }
    DJCi200mk3.loopResizeTicks[deck] = total;
};

// Stems buttons control stems: enabled in settings, supported by Mixxx and the loaded track has stems
DJCi200mk3._stemsActive = function(group) {
    return DJCi200mk3.useStems && DJCi200mk3.stemsAvailable && engine.getValue(group, "stem_count") > 0;
};

// Vocals only (vocalsOnly = true) or instrumental only (false); if already in that state, all stems play again
DJCi200mk3._toggleStems = function(group, vocalsOnly) {
    const count = engine.getValue(group, "stem_count");
    const vocals = Math.min(DJCi200mk3.vocalsStem, count);  // e.g. 2-stem files: instrumental + vocals
    const stemGroup = stem => `[${group.slice(1, -1)}_Stem${stem}]`;
    const shouldMute = stem => (stem === vocals) !== vocalsOnly;

    let alreadySet = true;
    for (let stem = 1; stem <= count; stem++) {
        if ((engine.getValue(stemGroup(stem), "mute") > 0) !== shouldMute(stem)) {
            alreadySet = false;
        }
    }
    for (let stem = 1; stem <= count; stem++) {
        engine.setValue(stemGroup(stem), "mute", !alreadySet && shouldMute(stem) ? 1 : 0);
    }
};

// === MIXER – SHARED KNOBS WITH PICKUP (GAIN/HIGH, MID, LOW, FILTER) ===

// Gain/High knob without SHIFT: treble (EQ High)
DJCi200mk3.highKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "high", value);
};

// Gain/High knob with SHIFT: Gain (input gain)
DJCi200mk3.gainKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "gain", value);
};

// Mid knob without SHIFT: mids (EQ Mid)
DJCi200mk3.midKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "mid", value);
};

// Mid knob with SHIFT: key adjustment, -3 to +3 whole semitones (centre = no adjustment)
DJCi200mk3.keyKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "key", value);
};

// Low knob without SHIFT: bass (EQ Low)
DJCi200mk3.lowKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "low", value);
};

// Low knob with SHIFT: effect character (super knob) of the deck's FX unit
DJCi200mk3.fxSuperKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "fxSuper", value);
};

// Filter knob without SHIFT: filter (low-pass / high-pass)
DJCi200mk3.filterKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "filter", value);
};

// Filter knob with SHIFT: effect intensity (dry/wet) of the deck's FX unit (deck A = FX1, deck B = FX2)
DJCi200mk3.fxMixKnob = function(_channel, _control, value, status, _group) {
    DJCi200mk3._pickup(status, "fx", value);
};

// Functions of the shared knobs: knob = physical knob, other = the second function on the same knob,
// group / key = controlled Mixxx control, steps = whole numbers from -steps to +steps (key in semitones)
DJCi200mk3.KNOB_FUNCTIONS = {
    high: {knob: "gainHigh", other: "gain", group: deck => `[EqualizerRack1_[Channel${deck}]_Effect1]`, key: "parameter3"},
    gain: {knob: "gainHigh", other: "high", group: deck => `[Channel${deck}]`, key: "pregain"},
    mid: {knob: "mid", other: "key", group: deck => `[EqualizerRack1_[Channel${deck}]_Effect1]`, key: "parameter2"},
    key: {knob: "mid", other: "mid", group: deck => `[Channel${deck}]`, key: "pitch_adjust", steps: 3},
    low: {knob: "low", other: "fxSuper", group: deck => `[EqualizerRack1_[Channel${deck}]_Effect1]`, key: "parameter1"},
    fxSuper: {knob: "low", other: "low", group: deck => `[EffectRack1_EffectUnit${deck}]`, key: "super1"},
    filter: {knob: "filter", other: "fx", group: deck => `[QuickEffectRack1_[Channel${deck}]]`, key: "super1"},
    fx: {knob: "filter", other: "filter", group: deck => `[EffectRack1_EffectUnit${deck}]`, key: "mix"},
};

// which = name of the knob function in KNOB_FUNCTIONS
DJCi200mk3._pickup = function(status, which, value) {
    const deck = DJCi200mk3._deck(status);
    const {knob: knobName, other, group: groupOf, key, steps} = DJCi200mk3.KNOB_FUNCTIONS[which];
    const group = groupOf(deck);
    if (!DJCi200mk3.knob[deck][knobName]) {
        DJCi200mk3.knob[deck][knobName] = {pos: null, locked: {}, lastSet: {}};
    }
    const k = DJCi200mk3.knob[deck][knobName];
    const knobPos = DJCi200mk3._midiToParam(value);
    // A value outside the knob range (e.g. key adjusted by key lock) is caught at the knob's end stop
    const current = Math.min(Math.max(engine.getParameter(group, key), 0), 1);

    k.locked[other] = false;  // the other function will have to be "caught" again

    // Value was changed by something else meanwhile (mouse, other controller) → release
    if (k.locked[which] && Math.abs(current - k.lastSet[which]) > DJCi200mk3.PICKUP_THRESHOLD / 3) {
        k.locked[which] = false;
    }

    if (DJCi200mk3.startupSync) {
        k.locked[which] = true;  // startup position from the controller
    } else if (!k.locked[which]) {
        const near = Math.abs(knobPos - current) <= DJCi200mk3.PICKUP_THRESHOLD;
        const crossed = k.pos !== null && (k.pos - current) * (knobPos - current) <= 0;
        k.locked[which] = near || crossed;
    }
    k.pos = knobPos;

    if (k.locked[which]) {
        if (steps) {
            engine.setValue(group, key, Math.round((knobPos * 2 - 1) * steps));
        } else {
            engine.setParameter(group, key, knobPos);
        }
        k.lastSet[which] = engine.getParameter(group, key);
    }
};

// === PITCH FADER ===

// 14-bit pitch fader: the MSB message comes first, the LSB message completes the value
DJCi200mk3.pitchFaderMsb = function(_channel, _control, value, status, _group) {
    DJCi200mk3.pitchMsb[DJCi200mk3._deck(status)] = value;
};

DJCi200mk3.pitchFaderLsb = function(_channel, _control, value, status, group) {
    const position = (DJCi200mk3.pitchMsb[DJCi200mk3._deck(status)] << 7) | value;  // 0–16383, centre 8192
    engine.setValue(group, "rate", position < 8192 ? position / 8192 - 1 : (position - 8192) / 8191);
};

// === JOG WHEEL ===

// Jog touch: scratch if Vinyl is on or the deck is stopped; otherwise tempo nudge
DJCi200mk3.wheelTouch = function(_channel, _control, value, status, group) {
    const deck = DJCi200mk3._deck(status);
    const scratch = DJCi200mk3.vinylMode[deck] || !engine.getValue(group, "play");
    DJCi200mk3._touch(deck, value > 0, scratch ? DJCi200mk3.ACTION_SCRATCH : DJCi200mk3.ACTION_BEND);
};

// SHIFT + jog touch: fast seek through the track
DJCi200mk3.wheelTouchShift = function(_channel, _control, value, status, _group) {
    DJCi200mk3._touch(DJCi200mk3._deck(status), value > 0, DJCi200mk3.ACTION_SEEK);
};

// Turning the jog wheel top (with and without SHIFT)
DJCi200mk3.scratchWheel = function(_channel, _control, value, status, group) {
    const deck = DJCi200mk3._deck(status);
    const dir = DJCi200mk3._relative(value);
    switch (DJCi200mk3.scratchAction[deck]) {
    case DJCi200mk3.ACTION_SCRATCH:
        engine.scratchTick(deck, dir);
        break;
    case DJCi200mk3.ACTION_SEEK:
        engine.scratchTick(deck, dir * DJCi200mk3.scratchShiftMultiplier);
        break;
    default:
        engine.setValue(group, "jog", dir * DJCi200mk3.bendScale);
    }
};

// Turning the jog wheel ring: tempo nudge (pitch bend) while playing, fine seek when stopped
DJCi200mk3.bendWheel = function(_channel, _control, value, _status, group) {
    engine.setValue(group, "jog", DJCi200mk3._relative(value) * DJCi200mk3.bendScale);
};

// Touch / release of the jog wheel top
DJCi200mk3._touch = function(deck, touched, action) {
    if (touched) {
        if (action !== DJCi200mk3.ACTION_BEND) {
            DJCi200mk3._scratchEnable(deck);
        }
        DJCi200mk3.scratchAction[deck] = action;
    } else {
        // Only end a scratch this touch started (a Brake / Spinback must keep running after a pitch bend touch)
        const started = DJCi200mk3.scratchAction[deck];
        if (started === DJCi200mk3.ACTION_SCRATCH || started === DJCi200mk3.ACTION_SEEK) {
            engine.scratchDisable(deck);
        }
        DJCi200mk3.scratchAction[deck] = DJCi200mk3.ACTION_NONE;
    }
};

DJCi200mk3._scratchEnable = function(deck) {
    // Catching the record during a Brake / Spinback started by the mapping: end it first (otherwise its timer would
    // keep driving the deck) and start the scratch from standstill, as a record stopped by the hand.
    // A caught Brake stays stopped after the release (turntable motor off), a caught Spinback plays on
    const catching = DJCi200mk3.brakeStarted[deck] && engine.isScratching(deck);
    if (catching) {
        const caughtBrake = !DJCi200mk3.spinbackHeld[deck];
        engine.brake(deck, false);
        if (caughtBrake) {
            engine.setValue(`[Channel${deck}]`, "play", 0);
        }
    }
    DJCi200mk3.brakeStarted[deck] = false;
    DJCi200mk3.spinbackHeld[deck] = false;
    // Scratch speed: fewer ticks per revolution = each tick moves the track further
    const intervalsPerRev = Math.round(248 / DJCi200mk3.scratchScale);
    const alpha = 1.0 / 8;
    engine.scratchEnable(deck, intervalsPerRev, 33 + 1 / 3, alpha, alpha / 32, !catching);
};

// === BEATMATCH GUIDE – TEMPO AND BEAT ALIGN ARROWS ===

// BEATMATCH GUIDE button (toggled by the controller): resend the arrows after it changes state
DJCi200mk3.guideButton = function(_channel, _control, _value, _status, _group) {
    engine.beginTimer(300, function() {
        DJCi200mk3.ledCache = {};
    }, true);
};

// Recalculates the arrows of both decks (called by a timer from init)
DJCi200mk3._updateGuide = function() {
    for (const deck of [1, 2]) {
        const group = `[Channel${deck}]`;
        const state = DJCi200mk3._guideState(group, `[Channel${3 - deck}]`);

        // The fader sends the lowest value at the top: with rate_dir -1 (Mixxx default) up is faster, with 1 down
        const upIsFaster = engine.getValue(group, "rate_dir") < 0;
        DJCi200mk3._arrow(deck, "tempoUp", upIsFaster ? state.faster : state.slower);
        DJCi200mk3._arrow(deck, "tempoDown", upIsFaster ? state.slower : state.faster);
        DJCi200mk3._arrow(deck, "alignBack", state.back);
        DJCi200mk3._arrow(deck, "alignForward", state.forward);
    }
};

// What the arrows of one deck should show: slower / faster = tempo, back / forward = Beat Align
DJCi200mk3._guideState = function(group, other) {
    const state = {slower: false, faster: false, back: false, forward: false};

    // Other deck not playing: arrows below the jog warn about the end of the track
    if (!engine.getValue(other, "play")) {
        state.back = state.forward = engine.getValue(group, "end_of_track") > 0;
        return state;
    }
    if (!engine.getValue(group, "track_loaded")) {
        return state;
    }

    const bpm = engine.getValue(group, "bpm");
    const otherBpm = engine.getValue(other, "bpm");
    if (!(bpm > 0 && otherBpm > 0)) {
        return state;
    }

    // Half or double tempo also fits (e.g. 87 and 174 BPM): compare with that multiple of the other deck's tempo
    const multiple = DJCi200mk3._tempoMultiple(bpm, otherBpm);
    const diff = bpm - otherBpm * multiple;
    state.slower = diff > DJCi200mk3.guideTempoTolerance;
    state.faster = diff < -DJCi200mk3.guideTempoTolerance;

    // Beat Align only makes sense at matching tempo and with both decks playing
    if (!state.slower && !state.faster && engine.getValue(group, "play")) {
        const phase = DJCi200mk3._phaseOffset(group, other, multiple);
        state.back = phase > DJCi200mk3.guidePhaseTolerance;
        state.forward = phase < -DJCi200mk3.guidePhaseTolerance;
    }
    return state;
};

// 2 or 0.5 if the deck plays at about double / half the tempo of the other deck (within 10 %), otherwise 1
DJCi200mk3._tempoMultiple = function(bpm, otherBpm) {
    for (const multiple of [2, 0.5]) {
        if (Math.abs(bpm / (otherBpm * multiple) - 1) <= 0.1) {
            return multiple;
        }
    }
    return 1;
};

// Beat offset of the deck against the other deck, in the range -0.5 to 0.5 of a beat (+ = deck is ahead);
// at half / double tempo (multiple from _tempoMultiple) it is measured in beats of the faster deck
DJCi200mk3._phaseOffset = function(group, other, multiple) {
    let own = engine.getValue(group, "beat_distance");
    let others = engine.getValue(other, "beat_distance");
    if (multiple > 1) {
        others = (others * multiple) % 1;
    } else if (multiple < 1) {
        own = (own / multiple) % 1;
    }
    let phase = own - others;
    if (phase > 0.5) {
        phase -= 1;
    }
    if (phase < -0.5) {
        phase += 1;
    }
    return phase;
};

DJCi200mk3._arrow = function(deck, name, on) {
    const id = deck + name;
    if (DJCi200mk3.ledCache[id] === on) {
        return;
    }
    DJCi200mk3.ledCache[id] = on;
    midi.sendShortMsg(DJCi200mk3.DECK_STATUS[deck], DJCi200mk3.ARROW[name], on ? 0x7F : 0x00);
};

// === SHARED HELPER FUNCTIONS ===

// Deck number from the MIDI channel: 0x91/0x94/0xB1/0xB4 → 1, 0x92/0x95/0xB2/0xB5 → 2
DJCi200mk3._deck = function(status) {
    const ch = status & 0x0F;
    return (ch === 1 || ch === 4) ? 1 : 2;
};

// Deck number from the group: "[Channel2]" → 2
DJCi200mk3._deckFromGroup = function(group) {
    return Number.parseInt(group.substring(8, group.length - 1), 10);
};

// Relative jog / encoder value: 0x01–0x3F = +, 0x41–0x7F = −
DJCi200mk3._relative = function(value) {
    return value < 0x40 ? value : value - 0x80;
};

// MIDI value 0–127 → range 0–1 (centre 64 = exactly 0.5)
DJCi200mk3._midiToParam = function(value) {
    return value === 64 ? 0.5 : value / 127;
};

// Whether Mixxx knows the control: connecting to an unknown control returns no connection
DJCi200mk3._controlExists = function(group, key) {
    const connection = engine.makeConnection(group, key, function() {});
    if (!connection) {
        return false;
    }
    connection.disconnect();
    return true;
};

DJCi200mk3._press = function(group, key) {
    engine.setValue(group, key, 1);
    engine.setValue(group, key, 0);
};
