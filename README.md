# Hercules DJControl Inpulse 200 MK3 – Mixxx mapping

Version **1.0** (October 2026) · author: Dušan Ivančo
Based on the Inpulse 200 MK2 mapping by DJ Phatso and Kerrick Staley, reworked and extended for the MK3.

Controller mapping for [Mixxx](https://mixxx.org) **2.5** or newer (tested on 2.5.x, macOS).
The stems function of the Stems buttons needs Mixxx 2.6 and has not been tested on the hardware yet.

## Files

| File | Contents |
|---|---|
| `Hercules-DJControl-Inpulse-200-MK3.midi.xml` | maps the controller's MIDI messages to Mixxx controls and LEDs; MIDI message overview in the header comment |
| `Hercules-DJControl-Inpulse-200-MK3.scripts.js` | script with the logic (jog, knob pickup, loops, Beatmatch Guide…); settings at the top of the file |
| `manual/hercules_djcontrol_inpulse_200_mk3.rst` | user documentation – all controls, pad modes, Beatmatch Guide |

File names follow the Mixxx convention, so the mapping and script can be copied to `res/controllers/`
of the [Mixxx repository](https://github.com/mixxxdj/mixxx) as they are, and the manual page to
`source/hardware/controllers/` of [mixxxdj/manual](https://github.com/mixxxdj/manual).

## Installation

1. Copy `Hercules-DJControl-Inpulse-200-MK3.midi.xml` and `Hercules-DJControl-Inpulse-200-MK3.scripts.js`
   to the `controllers` folder of the Mixxx user profile
   (macOS: `~/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/controllers`).
2. Mixxx → **Preferences → Controllers** → *DJControl Inpulse 200 MK3* → enable it and select
   the *Hercules DJControl Inpulse 200 MK3* mapping.
3. After editing the files, reload the mapping in Mixxx (or restart Mixxx).

## Usage

See [the user manual page](manual/hercules_djcontrol_inpulse_200_mk3.rst) for the description of all controls.

## Diagnostics – finding a MIDI code

1. Quit Mixxx.
2. In Terminal run: `/Applications/Mixxx.app/Contents/MacOS/mixxx --controller-debug`
3. Press the button – a line `incoming: … status 0x.. … ctrl 0x.. val 0x..` appears in the output.

## History

- **1.0** – complete rework for the MK3: verified MIDI codes for pads and buttons, Stems buttons (stems on Mixxx 2.6+,
  otherwise Brake / Spinback),
  manual loop, ½ / ×2 loops, shared knobs with pickup (gain, effects, key), key lock,
  mix recording, fast scrolling, Beatmatch Guide (incl. half / double tempo), Vinyl per deck.
