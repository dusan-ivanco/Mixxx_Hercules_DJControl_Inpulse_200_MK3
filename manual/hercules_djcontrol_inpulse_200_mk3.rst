.. _hercules-djcontrol-inpulse-200-mk3:

Hercules DJControl Inpulse 200 MK3
==================================

-  `Manufacturer’s support and downloads page <https://support.hercules.com/product/djcontrolinpulse200mk3/>`__

.. versionadded:: 2.6.0

Compatibility
-------------

This controller is a class compliant USB MIDI and audio device, so it can be used without any special drivers on GNU/Linux, macOS, and Windows.
However, if you wish to use the :ref:`ASIO sound API <preferences-sound-api>` under Windows, please install the latest driver package available from the `support page <https://support.hercules.com/product/djcontrolinpulse200mk3/>`__.

Sound Card Setup
----------------

This controller has a built-in 4 channel output sound card, with :hwlabel:`MASTER` output (RCA) and :hwlabel:`HEADPHONES` output (3.5mm jack).

1. Open :guilabel:`Preferences > Sound Hardware`
2. Select the :guilabel:`Output` tab
3. From the :guilabel:`Main` drop-down menu, select the audio interface, then :guilabel:`Channels 1 - 2`
4. From the :guilabel:`Headphones` drop-down menu, select the audio interface, then :guilabel:`Channels 3 - 4`
5. Click :guilabel:`Apply` to save the changes.

.. seealso::
   The :ref:`example setups section <setup-laptop-and-external-card>` provides more details about the audio configuration in Mixxx.

.. note::
   The :hwlabel:`MASTER` and :hwlabel:`HEADPHONES` volume knobs and the :hwlabel:`MASTER` button are hardware controls of the integrated sound card and are not mapped in Mixxx.
   The :hwlabel:`MASTER` button routes the main output to the headphones output. :hwlabel:`SHIFT` + :hwlabel:`MASTER` starts and stops recording the mix.

Mapping description
-------------------

All controls not mentioned behave as labeled.

Decks
~~~~~

Deck A uses effect unit 1, deck B uses effect unit 2.

With Mixxx 2.6 or newer, the Stems buttons control the stems when the loaded track is a stem file.
For other tracks they work as Brake and Spinback.

===============================================================  ==========================================
Control                                                          Function
===============================================================  ==========================================
Play button                                                      Play/Pause the current track.
:hwlabel:`SHIFT` + Play button                                   Cue Stutter.
:hwlabel:`CUE` button                                            Specifies, plays or recalls temporary cue point.
:hwlabel:`SHIFT` + :hwlabel:`CUE` button                         Play from the beginning of the track.
:hwlabel:`SYNC` button                                           Short press: match tempo and phase to the other deck once. Hold: enable :ref:`Sync Lock <sync-lock>`, press again to disable it.
:hwlabel:`SHIFT` + :hwlabel:`SYNC` button                        Make the deck Sync leader.
:hwlabel:`LOOP` button                                           Manual loop: first press sets the loop in point, second press sets the loop out point, third press disables the loop. A second press before the loop in point sets a new loop in point.
:hwlabel:`SHIFT` + :hwlabel:`LOOP` button                        Toggle Vinyl (scratch) mode (default: on). The :hwlabel:`LOOP` LED shows the state while :hwlabel:`SHIFT` is held.
Left Stems button                                                Stem track: play the instrumental only (vocals muted), press again to play all stems. Other tracks: Brake, the track slows down to a stop.
:hwlabel:`SHIFT` + left Stems button                             Halve the active loop.
Right Stems button                                               Stem track: play the vocals only, press again to play all stems. Other tracks: Spinback, the track spins backward while the button is held and plays on when released (a long hold stops the deck).
:hwlabel:`SHIFT` + right Stems button                            Double the active loop.
Headphones button                                                Toggle headphone cueing (PFL).
:hwlabel:`SHIFT` + Headphones button                             Toggle key lock.
:hwlabel:`LOAD` button                                           Load the selected track.
:hwlabel:`SHIFT` + :hwlabel:`LOAD` button                        Eject the track.
Jog wheel top                                                    Scratch when Vinyl mode is on or the deck is stopped, otherwise temporary pitch bend.
:hwlabel:`SHIFT` + jog wheel top                                 Fast seek through the track.
Jog wheel ring                                                   Temporary pitch bend while playing, fine seek when stopped.
Tempo fader                                                      Adjust the tempo.
===============================================================  ==========================================

Mixer
~~~~~

The knobs have a second function on the :hwlabel:`SHIFT` layer. Because one knob controls two values, a value only follows the knob after the knob has reached or crossed it (pickup).
Nothing jumps when you switch layers.

===============================================================  ==========================================
Control                                                          Function
===============================================================  ==========================================
:hwlabel:`HIGH / GAIN` knob                                      Adjust the high EQ.
:hwlabel:`SHIFT` + :hwlabel:`HIGH / GAIN` knob                   Adjust the deck gain.
:hwlabel:`MID` knob                                              Adjust the mid EQ.
:hwlabel:`SHIFT` + :hwlabel:`MID` knob                           Adjust the musical key by -3 to +3 whole semitones (center: no adjustment).
:hwlabel:`LOW` knob                                              Adjust the low EQ.
:hwlabel:`SHIFT` + :hwlabel:`LOW` knob                           Adjust the meta knob (super knob) of the deck's effect unit.
:hwlabel:`FILTER` knob                                           Adjust the quick effect (filter).
:hwlabel:`SHIFT` + :hwlabel:`FILTER` knob                        Adjust the dry/wet mix of the deck's effect unit.
Volume fader                                                     Adjust the deck volume.
Crossfader                                                       Crossfade between the decks.
:hwlabel:`SHIFT` + :hwlabel:`MASTER` button                      Start/stop recording the mix.
===============================================================  ==========================================

Browser
~~~~~~~

===============================================================  ==========================================
Control                                                          Function
===============================================================  ==========================================
:hwlabel:`BROWSER` turn                                          Move up/down the list.
:hwlabel:`SHIFT` + :hwlabel:`BROWSER` turn                       Move up/down the list 10 tracks at a time.
:hwlabel:`BROWSER` press                                         Move the focus forward (for example between the sidebar and the track list).
:hwlabel:`SHIFT` + :hwlabel:`BROWSER` press                      Maximize/restore the library view.
:hwlabel:`ASSIST./PREP.` button                                  Toggle :ref:`Auto DJ <library-auto-dj>` (the Auto DJ queue must contain tracks).
===============================================================  ==========================================

Performance Pads
~~~~~~~~~~~~~~~~

Press :hwlabel:`HOT CUE` or :hwlabel:`FX` to select a mode.
Press :hwlabel:`SHIFT` + :hwlabel:`HOT CUE` for Loop mode and :hwlabel:`SHIFT` + :hwlabel:`FX` for Sampler mode.

Hot Cue Mode
^^^^^^^^^^^^

===============================================================  ==========================================
Control                                                          Function
===============================================================  ==========================================
Pad 1 - 4                                                        Set and trigger :term:`hotcue` 1 - 4.
:hwlabel:`SHIFT` + Pad 1 - 4                                     Delete :term:`hotcue` 1 - 4.
===============================================================  ==========================================

FX Mode
^^^^^^^

===============================================================  ==========================================
Control                                                          Function
===============================================================  ==========================================
Pad 1 - 3                                                        Toggle effect 1 - 3 of the deck's effect unit.
Pad 4                                                            Enable/disable the deck's effect unit for the deck.
:hwlabel:`SHIFT` + Pad 1 - 3                                     Load the next effect into slot 1 - 3.
:hwlabel:`SHIFT` + Pad 4                                         Load the next effect chain preset.
===============================================================  ==========================================

Loop Mode
^^^^^^^^^

===============================================================  ==========================================
Control                                                          Function
===============================================================  ==========================================
Pad 1 - 4                                                        Toggle a beatloop of 1, 2, 4 or 8 beats.
:hwlabel:`SHIFT` + Pad 1 - 4                                     Beatloop roll of 1/8, 1/4, 1/2 or 1 beat while the pad is held.
===============================================================  ==========================================

Sampler Mode
^^^^^^^^^^^^

===============================================================  ==========================================
Control                                                          Function
===============================================================  ==========================================
Pad 1 - 4 (deck A)                                               Play sampler 1 - 4.
Pad 1 - 4 (deck B)                                               Play sampler 5 - 8.
:hwlabel:`SHIFT` + Pad 1 - 4                                     Stop the sampler.
===============================================================  ==========================================

Beatmatch Guide
~~~~~~~~~~~~~~~

Each deck has four red arrows that help with beatmatching by ear. The deck is compared with the other deck while that deck is playing.

-  **Tempo arrows** (next to the tempo fader) show which way to move the tempo fader to match the BPM of the other deck. Both arrows are off when the tempo matches.
-  **Beat Align arrows** (below the jog wheel) show which way to turn the jog wheel ring to align the beats, when the tempo matches and both decks are playing. Both arrows are off when the beats are aligned.
-  When the other deck is not playing, both Beat Align arrows light up near the end of the track.
-  Half or double tempo also counts as a match (for example 87 and 174 BPM), the arrows then guide to that tempo.

The :hwlabel:`BEATMATCH GUIDE` button is handled by the controller itself: when its LED is off, the arrows are shown; when its LED is on, the controller hides them.

Mapping options
~~~~~~~~~~~~~~~

The behavior of the mapping can be adjusted in :guilabel:`Preferences > Controllers > DJControl Inpulse 200 MK3`:

-  **Jog wheel**: Vinyl mode at startup, scratch speed, fast seek speed (:hwlabel:`SHIFT` + jog wheel) and pitch bend strength.
-  **Stems buttons**: whether they control stems (Mixxx 2.6 and newer, otherwise always Brake and Spinback), the number of the vocals stem in your stem files, Brake speed and Spinback length.
-  **Beatmatch Guide**: the tempo and Beat Align tolerances.
-  **Library**: how many tracks :hwlabel:`SHIFT` + browser encoder moves per step.
