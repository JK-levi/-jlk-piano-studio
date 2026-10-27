# JLK Piano Studio · 1.5

A focused, mobile-first piano studio with charcoal cards, ivory notation, and three dedicated experiences: Explore, Progressions, and Practice. Plain HTML, CSS, and JavaScript modules. No build, runtime dependencies, accounts, tracking, backend, or paid services.

## Preview

From the repository root:

```sh
python3 -m http.server 8000
```

Open the site through that HTTP server in your browser. Alternatively, `npm run serve` runs the same command. Opening `index.html` directly with a `file:` URL will not load JavaScript modules or the service worker correctly. Python is only a preview server; the deployed app needs no Python or Node.js.

## Use the studio

- **Explore:** tap the score’s ellipsis to open the dedicated Chord Editor, then choose a root (including alternate sharp/flat spellings), one of 13 chord qualities, inversion, root octave, and close/open voicing. The warm-white grand staff and keyboard follow the exact same notes. Note-name and key-label switches persist locally. Tap or focus and press a piano key to hear it. Sound starts only after interaction.
- **Progressions:** add the current explorer chord, select a chord to inspect it; Edit chords reveals duplicate, remove, and move buttons. Edit sequence opens the dedicated editing view for patterns, metronome, key and transposition. Library / Save opens presets and device-local saves. View selected chord opens the shared score/keys when needed during playback. Load a sample or build your own sequence. Play at 40–180 BPM, four beats per chord, with block or eighth-note broken chords, an optional metronome, and a Loop progression switch. A defined major/minor analysis key shows Roman numerals; choose No defined key to hide them. Cadence and minor-key examples complement the original three presets. Pause silences playback; Resume begins the paused chord again. Stop returns to the beginning. Changing playback settings stops playback before applying them.
- **Transpose:** shifts the entire progression by a semitone. Smooth inversions chooses nearby close voicings after the first chord; turn it off to keep existing inversion and octave settings. Root choices favor flats in flat keys. Transposition preserves pitch classes; crossing a pitch-class boundary may change the root's octave rather than shift every voice literally by one semitone.
- **Save:** name a progression and save it on this device (up to 50 saves, 64 chords each). Saving the same name replaces that named save. Loading a preset replaces the working sequence, leaving named saves intact. The working sequence also survives reload. No data syncs between devices; clearing browser/site data removes it.
- **Practice:** read the chord and staff, try it on your own instrument, then reveal the keyboard. Next chord gives another prompt. On-screen attempts track each exact written pitch and octave, accept notes in any order, and never count a repeated note twice. Hint identifies the next missing note; Try again resets the attempt. External-instrument practice is still self-guided, with no microphone or MIDI permission.
- **A moment with Bach:** hear and read C4–E4–G4–C5–E5 from the opening C major harmony of BWV 846. Playback continues the upper G4–C5–E5 figure with the lower tones ringing. Two readable 4/4 bars use a simplified eighth-note study rhythm rather than the original sixteenth-note engraving. It is a short learning example, not a complete score.

Middle C is **C4**. Chords are spelled by scale degree, including E♯, C♭, and double accidentals when required. Accidentals apply to the written notes; there is no key signature. Lower notes use bass clef; C4 and above use treble. Each chord has a reading guide below the staff. Open voicing lifts the second-lowest tone by an octave. The visible keyboard automatically follows the current register.

## Deploy on GitHub Pages

1. Review and commit the project files to the repository, keeping `index.html` at its root.
2. In GitHub **Settings → Pages**, choose **Deploy from a branch**, select the branch containing the files, and choose **/ (root)**.
3. Save, wait for deployment, then open the HTTPS Pages site.

All asset, module, manifest, and service-worker URLs are relative. The app works under a project path such as `/-jlk-piano-studio/` as well as at a domain root. No base URL configuration or build command is needed.

## iPhone Home Screen and offline use

Open the HTTPS site in **Safari**, tap **Share → Add to Home Screen → Add**, then open JLK Studio from its icon. On supported desktop/Android browsers, an Install studio button appears when installation is available. Safari uses its Share menu instead.

The service worker caches the complete local app after the first successful online load. Wait for that load to complete before testing offline. Installed files and local saves work without a network. A service worker requires HTTPS (or a local development server). Private browsing, disabled storage, or OS storage eviction can prevent persistence. Audio may require another tap after switching apps; playback stops when the page is hidden.

When deploying a new app version, bump the `CACHE` version in `service-worker.js` whenever cached assets change. The new worker installs in the background and activates after old app windows close. Reopen the app to use the updated cache. Offline status indicates network state, not a guarantee that installation completed.

## Tests

No package installation is required for the theory tests. With Node.js 20 or newer:

```sh
npm test
```

Tests cover every root, quality, octave, voicing, and inversion combination; note/MIDI agreement; double accidentals; explicit extended-chord inversions; octave boundaries; transposition; voice leading; staff positions; and malformed/blocked local storage.

An optional browser smoke test uses Python Playwright and Chromium, already available in the development environment. It is not an app dependency. Start the preview server first, then run:

```sh
python3 tests/browser_smoke.py
```

Set `CHROMIUM_PATH` if Chromium is installed elsewhere. Set `JLK_BASE_URL` to test a different server or repository subpath. The test checks mobile overflow, enharmonic labels, keyboard highlights, audio interactions, practice/reveal, progression editing, save/load across reloads, transposition, playback including completion, and service-worker offline reload. It writes screenshots to the system temporary directory. Audible output is not automatically judged.

### Manual release checklist

- [ ] On a real iPhone in Safari, test portrait/landscape, safe areas, readable accidentals, large tap targets, and no horizontal page overflow.
- [ ] Hear C major as a block and arpeggio; tap black and white keys; verify no stuck tones after Stop or backgrounding.
- [ ] Compare A♭maj7 (A♭–C–E♭–G), B♭m9 (B♭–D♭–F–A♭–C), and C♯ major (C♯–E♯–G♯) against an instrument.
- [ ] Explore inversions, low octaves, and high/open ninth chords; verify ledger lines, bass notes, and displayed octave names.
- [ ] Play a whole progression at 40 and 180 BPM, test both patterns and metronome, then pause, resume, and stop.
- [ ] Reorder/duplicate/remove, transpose with and without smooth inversions, save, reload, open, and delete a saved progression.
- [ ] Check practice hides highlights, Reveal works, and replay does not reveal automatically.
- [ ] Navigate controls and keys by keyboard; inspect with VoiceOver, larger text, and reduced motion.
- [ ] Add to iPhone Home Screen; reopen once online, then enable airplane mode and reopen offline.

### Validation in this environment

- All 27 Node test groups passed, including exhaustive construction checks.
- Chromium smoke tests passed at the site root and a GitHub Pages-style repository subpath, including 320px/390px overflow checks with no JavaScript page errors, including offline reload and persisted saves.
- Actual iPhone Safari, VoiceOver, Home Screen installation, and subjective sound quality still need the manual checks above.

## Project layout

- `js/theory.js` — spelling, MIDI conversion, chords, inversions, transposition, voice leading.
- `js/notation.js` — dependency-free SVG grand staff, clefs, ledger lines, accidentals, and labels.
- `js/audio.js` — gesture-activated Web Audio synthesis and voice cleanup.
- `js/storage.js` — defensive local preferences and progression persistence.
- `js/app.js` — accessible controls, keyboard, progression transport, practice, and installation.
- `js/playback.js` — shared audio-clock look-ahead scheduler, output-clock highlights, loops, completion, and cleanup.
- `js/exercises.js` — timed chord, arpeggio, progression, and Bach study plans.
- `js/practice.js` — exact-octave attempts, unique note progress, and hints.
- `js/progressions.js` — curated examples and key-aware Roman numerals.
- `manifest.webmanifest`, `service-worker.js`, `icons/` — installable offline app shell.

## First-version boundaries

The sound is a lightweight synthesized piano-like tone, not a sampled Roland instrument. Notation is a chord-learning grand staff, not a full engraving/score editor: stems point up and there are no key signatures. Broken-chord studies show beamed eighth notes, bar lines, 4/4 meter, beat counts, and unused-staff whole-measure rests. Bach uses an explicitly simplified study rhythm; ringing lower notes are an audio sustain aid rather than separately engraved polyphonic voices. Playback can loop; pause restarts the current chord. Voice leading uses nearest-tone distance rather than formal four-part harmony rules. Saves are device-local with no export/sync or recovery after browser data is cleared. No MIDI input, microphone analysis, or grading of external instruments is included.


## Version 1.1 audio and playback

Open **Sound** in the header for diagnostics and recovery. **Test Sound** sends C4 followed by E4; the feedback reports the engine state, not proof that your speakers are audible. **Recover audio** closes the old context and creates a fresh one inside the button gesture. No audio context is created on page load. Playback initializes or resumes a context immediately during the gesture when needed, primes a newly created context with a silent one-sample buffer, and verifies that a resumed context is actually `running`. A known-running engine is reused directly. Resolved-but-suspended, interrupted, rejected, and timed-out resume operations now produce visible errors instead of silently dropping notes.

The v1 failure could arise because `resume()` did not establish a running context and `tone()` silently returned, or from iOS output routing. This is a likely-path diagnosis, not reproduction of the user's physical device failure. On Safari versions that expose `navigator.audioSession`, the app requests the `playback` category. This is feature-detected and can fail without blocking other browsers. It cannot force a speaker route, bypass every OS mute policy, or verify the physical output.

If silent, raise **media volume**, check Control Center's audio destination (including Bluetooth), try the Ring/Silent switch on older Safari versions, and tap Test Sound again. After calls, locking, app switching, or returning to the Home Screen app, playback stops and the next gesture attempts recovery. If that fails, use Recover audio then Test Sound. No new permission or network request is required. All tones use local sine partials with a short hammer-like attack, independent decay, a low-pass filter, and a master compressor.

Arpeggiate shows one bar of beamed eighth notes. The **study tempo**, **Loop study**, **Replay**, and **Stop sound** controls apply to chord/arpeggio and Bach studies. Progressions have separate tempo and loop controls. Highlighting distinguishes the current attack/gate from a longer piano-like decay: the blue piano key and bronze notehead follow the output clock; resonating tails may outlast the highlight. Output timestamps are used where available, with reported output latency as a fallback. Bluetooth and physical-device timing remain approximate.

### Additional validation

```sh
python3 tests/browser_v11.py
```

This optional Chromium suite checks gesture-triggered initialization, a nonzero generated waveform, real context suspend/resume, a simulated interrupted context that resolves resume without running, explicit recovery, staff/key synchronization, cleanup, replay/loops, practice attempts/hints, Roman numerals, and 320/390/768/1440px page widths. It also hosts an isolated previous-worker fixture, installs the v1.1 worker while the old tab is open, closes old clients, then verifies activation, removal of the old cache, legacy saves, and offline audio. The fixture changes no repository files. Both browser suites require the preview server and optional Python Playwright/Chromium described above.

The service-worker cache is **jlk-studio-v1.2**. Local storage remains under **jlk-studio-v1-**, so existing preferences, working sequences, and named progressions remain compatible. An optional key field is additive; old saved progressions open with no defined analysis key. Close all old studio windows and Home Screen instances, then reopen online to activate the new worker before relying on updated offline assets.

### Physical iPhone release checks still required

- [ ] Safari and installed Home Screen app: Test Sound, block chords, arpeggios, piano keys, Bach, and progressions audibly play after a fresh load.
- [ ] Repeat with Ring/Silent enabled/disabled, media volume changes, speaker/headphones/Bluetooth, and no network after a successful cache update.
- [ ] Switch apps, lock/unlock, receive/end a call, and return from Control Center; confirm Test Sound/Play resumes, and Recover audio works when necessary.
- [ ] Confirm note/key highlights track audible attacks at slow/fast study tempos, including the loop seam; check output latency with headphones/Bluetooth.
- [ ] Use VoiceOver, larger text, and portrait/landscape; confirm the two short Bach measures and practice feedback remain readable.

No physical iPhone testing has been performed in this environment. Chromium's waveform and state tests establish that the engine generates a signal and handles the exercised states; they cannot establish audible output, OS routing, or exact timing on a physical iPhone.

## Progression playback and feedback fix · 1.1.1

The physical iPhone report established that Explorer played while the loaded C–Am–F–G progression was silent. The four-card preset is valid and generates C3/E3/G3, A3/C4/E4, F3/A3/C4, and G3/B3/D4 at four-beat intervals. An empty progression is not the explanation for that report. Chromium does not reproduce the physical-device silence, so the changes below address identified failure paths and small-speaker signal strength without claiming a verified device-specific root cause.

### Playback trace and corrections

1. The progression button validates its actual tempo and nonempty sequence before requesting audio. There is no silent default/clamp for missing, fractional, or out-of-range tempo.
2. A known-running engine now schedules directly within the tap; it does not call `resume()` again. A suspended/interrupted engine still initializes/resumes synchronously during the gesture and waits for a confirmed running result. An explicit Stop, mode change, or newer action invalidates deferred requests so they cannot unexpectedly start later.
3. Previously, a context interruption invoked a silent generic stop. It now ends the transport as **Failed** with a persistent inline error beside the controls. Engine status cannot erase this error, nor can a successful unrelated action. Recover audio resets the engine; successfully scheduling a retry resolves that transport's audio error.
4. Audio scheduling now uses its own 25ms look-ahead timer with a 160ms horizon. Animation frames only update visual state. Expired events are skipped after a timer stall rather than emitted in a burst.
5. The old output timestamp extrapolation could run ahead of `AudioContext.currentTime`, which could complete a sequence before its later chords were scheduled. Output timestamps are now checked for freshness and validity, with latency fallback and a render-clock clamp. The scheduler also independently prevents a future visual timestamp from completing playback early.
6. The low-register preset relies on fundamentals around 131–330Hz. Those can be weak on a small speaker. Notes below C4 now retain their exact fundamental pitches but use stronger second/third/fourth partials, with the existing compressor limiting output. This is a signal-strength mitigation, not evidence about a physical speaker's loudness or route.

Pause still silences the graph and resumes at the start of the current chord. Stop cancels both audio scheduling and animation and invalidates a pending resume. Loop, block/broken patterns, metronome, tempo, theory, saved progressions, and existing settings remain supported. An invalid temporary tempo does not overwrite the previously saved valid tempo.

### Feedback conventions

`js/feedback.js` provides reusable, control-scoped feedback. Errors use **Error**, an icon, contrasting border/background, `role="alert"`, and a Dismiss control. They do not auto-expire and cannot be overwritten by an unrelated message. Warnings identify missing prerequisites or capacity limits; restrained success confirmations expire after 4.5 seconds. User-provided text is rendered as text, never HTML. Invalid fields link to their message with `aria-describedby` and `aria-invalid`.

Progression, study, Bach, practice, keyboard, engine recovery, and save/load controls have their own message regions. Transport status reports **Starting**, **Playing**, **Paused**, **Stopped**, **Complete**, or **Failed** nearby. **Playing** means audio events have successfully been scheduled, not proof that the device emitted audible sound. Engine-running status is separately reported in the audio panel. With no chords, Play is disabled and an adjacent warning explains how to load/add chords.

### Regression checks

```sh
npm test
python3 tests/browser_smoke.py
python3 tests/browser_v11.py
python3 tests/browser_progression.py
```

The Node suite has 27 passing tests, including all four default chords' pitches/onsets, full visual advancement, stale/future output timestamps, independent scheduling without animation frames, explicit graph failures, and invalid tempo.

The new progression browser test starts from a fresh mobile session and taps Progression Play before using Explorer. It verifies 48 actual oscillator starts (12 notes × four partials), exact frequencies and four-beat timestamps for C3–Am3–F3–G3, a nonzero **post-compressor** high-passed signal for every card, synchronized visual advancement, pause/resume, stop and graph silence, broken-pattern looping/metronome, pending-start cancellation, simulated interruption/rejected resume, persistent local error feedback, empty states, save validation/storage failure, and readable 320/390px layouts. The existing browser suites still check offline installation/upgrades, old saves, and the rest of the application. `JLK_BASE_URL` supports testing the repository subpath, as before.

The cache version is now **jlk-studio-v1.1.1** and includes the feedback module. Local storage keeps the v1 namespace. Close all old Studio windows and Home Screen instances, then reopen online to activate the updated worker before testing offline.

### Physical iPhone verification still required

- [ ] Fresh Safari tab and Home Screen app: load the original C–Am–F–G preset and confirm all four block chords are audible through the built-in speaker at 40, 80, and 180 BPM.
- [ ] Compare low and upper root octaves, speaker versus headphones/Bluetooth, media volume, and Ring/Silent settings. Confirm the original low-register voicings are usefully audible without changing their pitches.
- [ ] Verify pause/resume, stop, loop seams, metronome, and broken patterns match the audible notes and highlights.
- [ ] Test after a call, app switching, screen lock, and returning to the Home Screen app. Interruptions should show **Failed** and an actionable error at the progression transport; recovery and a new tap should work.
- [ ] Check error text, dismiss controls, required-name/tempo feedback, and disabled-Play remedy with VoiceOver and larger text.
- [ ] Activate the new cache online, reopen offline, and repeat progression playback with existing saved progressions.

No physical iPhone audio verification was performed for this patch. A running engine, scheduled nodes, measured Chromium waveform, and passing automation cannot prove audibility or timing on the user's hardware.


## Version 1.2 interface refinement

[Design review and screenshots](docs/design-review.md) shows all three mobile and desktop screens and documents the reference interpretation, controls and checks. The main audio engine, scheduler, exercise plans, theory and storage implementation remain unchanged from the working 1.1.1 baseline. All existing controls remain available through focused screens and labeled disclosure panels, with one shared score/keyboard and no duplicated playback logic.

The charcoal/ivory/champagne design uses system fonts and a small local SVG background, without new dependencies or decorative animation. Sound settings are compact by default; persistent errors remain visible beside the affected transport and can open recovery settings. Newly invalid tempo reports Failed rather than leaving an old Complete message. Existing saved data and preferences retain their storage keys; only optional working-sequence title metadata is added.

The current worker cache is **jlk-studio-v1.2**. It includes the layout module and wave background; documentation screenshots are not runtime assets. Close old windows/Home Screen instances, reopen online to finish the update, then test offline.

Run the redesigned UI checks (preview server required):

```sh
python3 tests/browser_design.py
```

This tests navigation, controls, disclosures, synchronization, actual practice progress, data preservation, responsive widths, keyboard/reduced-motion behavior and offline use, and refreshes six screenshots in `docs/screenshots/`. `JLK_BASE_URL` selects a repository-subpath server; `JLK_SCREENSHOT_DIR` chooses another screenshot destination.

Physical iPhone validation of this visual release still remains: Safari/Home Screen safe areas, touch responsiveness, larger text/VoiceOver, audio/recovery/loops during navigation and after app switching, and offline updates. The user's successful audio verification applies to the preceding working version; it is not a claim that this visual patch has been tested on their device. No merge or deployment is performed by this task.


## Version 1.2.1 — focused navigation

[Navigation review and iPhone-sized screenshots](docs/navigation-review.md) documents the current screens and return behavior. Explore now contains only the musical workspace, compact playback and links to secondary tasks. Editing, theory, Bach, library/save and sound diagnostics each have a dedicated task view rather than a scrolling section. Progressions shows its sequence/transport normally; editing and optional notation/keyboard inspection have their own views. Practice contains its actual exercise and controls only.

The chord ellipsis opens the editor directly. **Back** and **Done** return to the previous workspace or parent task, restoring focus and scroll; browser Back/Forward and Escape use the same task stack. Chord changes apply immediately to the existing state/preferences. Adding from a nested progression editor returns to editing. There is one set of controls, notation, keyboard and audio state, moved between views as needed.

The audio engine, scheduler, music theory, exercise plans and storage module remain unchanged. Existing saves and preferences are retained. The new offline cache is **jlk-studio-v1.2.1**. Native task views use the same cached HTML/modules and work offline after installation/update.

Run the existing checks as before:

```sh
npm test
python3 tests/browser_smoke.py
python3 tests/browser_v11.py
python3 tests/browser_progression.py
python3 tests/browser_design.py
```

The updated design/navigation suite captures Explore, Chord Editor, Progressions, Practice and Bach Study in `docs/screenshots/v1.2.1/`. It covers nested returns, focus/scroll restoration, browser Back/Forward, state preservation, playback, library operations, responsiveness and offline use. `JLK_BASE_URL` selects another server or GitHub Pages-style repository path; `JLK_SCREENSHOT_DIR` changes the capture destination.

Physical iPhone testing of this patch remains required, particularly VoiceOver, native form controls and keyboard sizing, safe areas, back gestures, Safari/Home Screen audio recovery and offline updates. No merge or deployment is performed automatically.


## Version 1.3 Stage A

[Discover & Learn review](docs/v1.3-stage-a.md). Progressions → Browse & Play offers 18 curated sequences with feel/difficulty filters, Hear previews and Play along. My progressions holds personal saves and recoverable unsaved drafts. Explore → Guided studies contains four developing two-hand examples; the Bach-inspired arrangement is labeled as an original simplified study. The existing audio engine/scheduler and saved-data keys remain unchanged.

Run `npm test`, the existing browser suites, and `python3 tests/browser_discover.py`. Current cache: `jlk-studio-v1.3-a`. Close old app windows and reopen online before checking the updated offline version. Physical iPhone verification of this stage remains a manual release check.


## Version 1.3 Stage B

[Create & Assisted Composition review](docs/v1.3-stage-b.md). **Create** opens a real two-hand, eight-measure 4/4 editor. Enter notes, rests or simultaneous chords, audition optional **What Comes Next?** suggestions, then explicitly insert your choices. Save locally, reopen, back up as JSON and print a clean score. The original audio engine, scheduler, theory and progression saves are preserved. No runtime dependency or network service was added.

Run `npm test` and all six browser suites (`browser_smoke.py`, `browser_v11.py`, `browser_progression.py`, `browser_design.py`, `browser_discover.py`, `browser_composer.py`). Composer tests additionally use `pdftotext` to inspect Chromium print output. Current full-release cache: `jlk-studio-v1.3-b`. Physical iPhone playback, touch accessibility, Home Screen updates and printing remain manual checks.


## Mobile corrections — 1.3.1

[Review and screenshots](docs/mobile-corrections.md). A centered JLK header separates **Create Sheet Music** and **Settings** from the identity. View Selected Chord adds previous/next navigation, a full scrollable sequence and separate selected/playing indicators. Create loads the existing editor with visible loading and failure feedback; worker lookups are isolated to `jlk-studio-v1.3.1`. Audio, composition and saved-data models are preserved.

Run the six existing browser suites plus `tests/browser_mobile_corrections.py` and `tests/browser_mobile_update.py`. The latter upgrades the actual merged v1.3 fixture, retaining personal data and verifying offline composer use. Physical iPhone Safari/Home Screen, accessibility and printing remain manual release checks.

## Keyboard Progression Book — 1.4

[Source reconciliation, implementation and screenshots](docs/keyboard-book-review.md). **Progressions → Keyboard Progression Book** contains the complete user-uploaded **Second Edition**: 38 chord pages, six techniques, 116 blocks and 456 chord rows, including Viva La Vida. Browse by section or search titles/moods/patches; read exact RH/LH parts, follow page links, resume your place and print a clean reference page. Original instructions and both source versions are preserved, with transparent theory corrections.

Book playback is not invented from unspecified octaves/timing. Existing studio playback, practice, composition and saves are retained. Latest reference assets work offline under cache `jlk-studio-v1.4`. Run the existing suites plus `python3 tests/browser_book.py` and `python3 -m unittest discover -s tests -p 'test_keyboard_book_import.py' -v`. ChatGPT’s supplied content-organization checks are incorporated; physical iPhone verification remains a manual release check. Closer-to-recording arrangements are a separate follow-on.

## Meter support — 1.5

[Behavior, validation and review screenshots](docs/meter-support.md). **Create Sheet Music** now supports 4/4, 3/4, 6/8 and 12/8, with dotted notes/rests, meter-aware notation, counting, optional metronome, playback and printing. Tempo counts quarter notes in simple meters and dotted quarters in compound meters. Changing a written or saved piece creates an editable copy, preserves the original and keeps every existing measure and duration. Overfilled copies remain recoverable drafts until repaired; they cannot be played, printed as music or exported as valid scores.

Book version labels now use **Second Edition** in the interface, accessibility text and print output. Internal source provenance, reading-position IDs and user-created titles retain their original information. The current offline cache is `jlk-studio-v1.5`; the earlier version sections above describe release history.

Validation: 52 Node tests, seven source-audit tests, all ten browser suites and an additional upgrade from the book-inclusive main passed. Run `python3 tests/browser_meter.py` alongside the existing suites. Physical iPhone Safari/Home Screen audio, touch/accessibility, printing and update behavior still require device checks. Merge and deployment remain user-managed review steps.
