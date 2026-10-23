# Hercules DJControl Inpulse 200 MK3 – mapping pre Mixxx

Verzia **1.0** (október 2026) · autor: Dušan Ivančo
Vychádza z mappingu pre Inpulse 200 MK2 (DJ Phatso, Kerrick Staley), prerobené a rozšírené pre MK3.

## Súbory

| Súbor | Obsah |
|---|---|
| `Hercules_DJControl_Inpulse_200_MK3.midi.xml` | priradenie MIDI kódov ovládača k funkciám Mixxx a LED |
| `Hercules_DJControl_Inpulse_200_MK3.js` | skript s logikou (jog, pickup gombíkov, slučky, Beatmatch Guide…) |
| `Hercules_DJControl_Inpulse_200_MK3.md` | tento popis |

## Inštalácia a požiadavky

- Mixxx **2.5** alebo novší (testované na 2.5.x, macOS).
- Oba súbory musia byť v priečinku `controllers` používateľského profilu Mixxx.
- Mixxx → **Preferences → Controllers** → *DJControl Inpulse 200 MK3* → zapnúť a vybrať mapping *Hercules DJControl Inpulse 200 MK3*.
- Po úprave súborov treba mapping v Mixxx znovu načítať (alebo Mixxx reštartovať).

---

## Ovládanie

### Deck (A aj B rovnako)

| Ovládač | Bez SHIFT | So SHIFT |
|---|---|---|
| Play | play / pauza | stutter (skok na cue a hrať) |
| Cue | cue | hrať od začiatku skladby |
| Sync | sync (dlhé podržanie = hlavný deck) | tento deck bude hlavný (leader) |
| Loop | manuálna slučka: 1. stlačenie začiatok, 2. koniec, 3. vypnúť | Vinyl (scratch) zap/vyp |
| Stems ľavé | **Brake** – skladba zabrzdí do zastavenia | skrátiť bežiacu slučku na ½ |
| Stems pravé | **Spinback** – kým je stlačené, platňa sa točí dozadu | predĺžiť bežiacu slučku na ×2 |
| PFL | deck do slúchadiel | Key lock (tónina sa nemení s tempom) |
| Load | načítať vybranú skladbu | vysunúť skladbu z decku |
| Jog – dotyk vrchu | scratch (Vinyl zap. alebo deck stojí), inak doladenie tempa | rýchle posúvanie v skladbe |
| Jog – okraj | doladenie tempa (pitch bend) | – |
| Pitch fader | tempo | – |
| Hlasitosť | hlasitosť decku | – |

### Gombíky decku (so zdieľanou funkciou)

| Gombík | Bez SHIFT | So SHIFT |
|---|---|---|
| Gain/High | EQ výšky | Gain |
| Mid | EQ stredy | tónina skladby (po celých poltónoch, stred = pôvodná) |
| Low | EQ basy | charakter efektov (super knob) FX jednotky decku |
| Filter | filter | intenzita efektov (dry/wet) FX jednotky decku |

Deck A používa efektovú jednotku **FX1**, deck B **FX2**.

**Pickup:** jeden fyzický gombík ovláda dve hodnoty, preto hodnota začne gombík nasledovať až vtedy,
keď ju gombík dosiahne alebo prejde cez ňu. Po prepnutí cez SHIFT teda nič neskočí – treba gombíkom
prejsť cez aktuálnu hodnotu. Ak sa hodnota medzitým zmení myšou, gombík ju musí „chytiť“ znova.
(Vstavaný soft-takeover v Mixxx pri zdieľanom gombíku nefunguje.)

### Pady

Režim sa prepína tlačidlami nad padmi; druhý režim cez SHIFT + tlačidlo (prepína priamo ovládač).

| Režim | Pady 1–4 | SHIFT + pady 1–4 |
|---|---|---|
| HOT CUE | nastaviť / skočiť na hot cue 1–4 | zmazať hot cue |
| FX | efekty 1–3 FX jednotky zap/vyp, pad 4 = jednotka na deck zap/vyp | ďalší efekt v slote 1–3, pad 4 = ďalšia sada efektov |
| LOOP (SHIFT + HOT CUE) | slučka 1 / 2 / 4 / 8 dôb zap/vyp | roll 1/8 / 1/4 / 1/2 / 1 doby (kým je stlačený) |
| SAMPLER (SHIFT + FX) | prehrať sampler 1–4 (deck B: 5–8) | zastaviť sampler |

### Stred ovládača

| Ovládač | Bez SHIFT | So SHIFT |
|---|---|---|
| Gombík prehliadača – otáčanie | posun v zozname | posun po 10 skladbách |
| Gombík prehliadača – stlačenie | prepnúť zoznam / skladby | zväčšiť knižnicu |
| Assistant | AutoDJ zap/vyp (fronta AutoDJ musí obsahovať skladby) | – |
| MASTER | celý mix aj do slúchadiel zap/vyp (svieti = zapnuté) | nahrávanie mixu štart/stop |
| BEATMATCH GUIDE | šípky Guide zap/vyp – **svieti = vypnuté** (viď nižšie) | – |
| Crossfader | crossfader | – |
| Master / Headphones hlasitosť | rieši priamo hardvér ovládača | – |

Nahrávky mixu: cieľový priečinok a formát sa nastavujú v **Preferences → Recording**.

### Beatmatch Guide (šípky)

Na každom decku 4 červené šípky – pomôcka pri ručnom mixovaní bez Sync. Deck sa porovnáva
s druhým deckom, ktorý práve hrá:

- **Tempo** (pri pitch faderi): ktorým smerom posunúť pitch fader, aby sa BPM zhodovali. Pri zhode zhasnú.
- **Beat Align** (pod jogom): pri rovnakom tempe a keď hrajú oba decky – ktorým smerom pootočiť
  jog, aby doby padli na seba. Pri zarovnaní zhasnú.
- Keď druhý deck nehrá, šípky pod jogom svietia, keď sa blíži **koniec skladby**.

Tlačidlo **BEATMATCH GUIDE** je hardvérový prepínač ovládača a skript ho nevie ovládať:
*nesvieti* = ovládač šípky z Mixxx zobrazuje, *svieti* = blokuje ich. Stav si ovládač pamätá,
kým je pripojený – ak po spustení šípky nejdú, stačí ho raz stlačiť.

---

## Nastavenia v skripte

Na začiatku `Hercules_DJControl_Inpulse_200_MK3.js`:

| Premenná | Predvolene | Význam |
|---|---|---|
| `scratchScale` | 1.0 | rýchlosť scratchu |
| `scratchShiftMultiplier` | 4 | SHIFT + jog: koľkokrát rýchlejšie posúvanie |
| `bendScale` | 1.0 | sila doladenia tempa jogom |
| `effectMeta` | 0.6 | počiatočný hlavný parameter (meta) každého efektu |
| `vinylOnStartup` | true | Vinyl (scratch) zapnutý po spustení |
| `brakeFactor` | 1.0 | Brake: vyššie = rýchlejšie zastavenie |
| `spinbackFactor` | 1.8 | Spinback: vyššie = dlhšie pretočenie |
| `guideTempoTolerance` | 0.1 | Guide: rozdiel BPM považovaný za zhodu |
| `guidePhaseTolerance` | 0.03 | Guide: odchýlka dôb považovaná za zarovnanie |
| `guideTempoInvert` | true | otočenie šípok Tempo (overené na tomto ovládači) |
| `pickupThreshold` | 0.03 | ako blízko musí byť gombík, aby hodnotu „chytil“ |
| `browseFastStep` | 10 | SHIFT + prehliadač: o koľko skladieb naraz |

---

## MIDI kódy (overené na MK3)

Status: `0x90` globálne, `0x93` globálne so SHIFT, `0x91/0x92` deck A/B, `0x94/0x95` deck A/B so SHIFT,
`0x96/0x97` pady A/B, `0xB0` globálne gombíky, `0xB1/0xB2` gombíky A/B, `0xB3` prehliadač so SHIFT,
`0xB4/0xB5` gombíky A/B so SHIFT.

| Ovládač | Kód (deck A; deck B analogicky) |
|---|---|
| SHIFT (samotný) | `0x91 0x04` – mapping ho nepotrebuje |
| Play / Cue / Sync | `0x91 0x07 / 0x06 / 0x05` |
| Loop | `0x91 0x03` |
| Stems ľavé / pravé | `0x91 0x09 / 0x0A` (na MK2 boli Loop ½ / ×2) |
| PFL / Load | `0x91 0x0C / 0x0D` |
| Jog dotyk | `0x91 0x08` (SHIFT `0x94 0x08`) |
| Tlačidlá režimov padov | `0x91 0x0F` HOT CUE, `0x10` FX (+ SHIFT varianty) – rieši ovládač |
| Pady – HOT CUE / FX / LOOP / SAMPLER | `0x96 0x00 / 0x10 / 0x20 / 0x30` (+0x08 so SHIFT, +1 na každý pad) |
| Hlasitosť / Filter / Low / Mid / Gain-High | `0xB1 0x00 / 0x01 / 0x02 / 0x04 / 0x05` (so SHIFT `0xB4`) |
| Pitch fader | `0xB1 0x08` (MSB) + `0x28` (LSB) |
| Jog okraj / vrch | `0xB1 0x09 / 0x0A` |
| Crossfader | `0xB0 0x00` |
| Prehliadač otáčanie | `0xB0 0x01` (SHIFT `0xB3 0x01`) |
| Prehliadač stlačenie | `0x90 0x00` (SHIFT `0x93 0x00`) |
| Assistant | `0x90 0x03` |
| BEATMATCH GUIDE | `0x90 0x01` |
| MASTER | `0x90 0x02` (SHIFT `0x93 0x02`) |
| Hlasitosť Master / Headphones | `0xB0 0x03 / 0x04` – hardvér, nemapované |

LED: šípky Guide `0x91/0x92` + `0x21` (Beat Align vľavo), `0x22` (vpravo), `0x23` (Tempo dole),
`0x24` (Tempo hore); Vinyl `0x94/0x95 0x03`; MASTER `0x90 0x02`; prehliadač `0x90 0x04`.

Nepoužité / nezistené: SHIFT + pitch fader (`0xB4 0x08`), SHIFT + Assistant, SHIFT + okraj jogu,
SHIFT + hlasitosť decku, zelená LED stredu pitch fadera.

## Diagnostika – ako zistiť MIDI kód

1. Ukončiť Mixxx.
2. V Termináli spustiť: `/Applications/Mixxx.app/Contents/MacOS/mixxx --controller-debug`
3. Stlačiť tlačidlo – vo výpise sa objaví riadok `incoming: … status 0x.. … ctrl 0x.. val 0x..`.

---

## História

- **1.0** – kompletné prerobenie pre MK3: overené MIDI kódy padov a tlačidiel, Brake / Spinback,
  manuálna slučka, ½ / ×2 slučky, zdieľané gombíky s pickupom (Gain, efekty, tónina), Key lock,
  nahrávanie mixu, rýchle listovanie, MASTER do slúchadiel, Beatmatch Guide, Vinyl pre každý deck,
  slovenské popisy.
- **0.1** – prvá adaptácia mappingu MK2 (EQ Mid, príprava Stems).
