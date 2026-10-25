# JLK Piano Studio

A quiet, mobile-first space for learning piano chords through written notes, physical keys, and sound. Plain HTML, CSS, and JavaScript modules. No build, runtime dependencies, accounts, tracking, backend, or paid services.

## Preview

From the repository root:

```sh
python3 -m http.server 8000
```

Open the site through that HTTP server in your browser. Alternatively, `npm run serve` runs the same command. Opening `index.html` directly with a `file:` URL will not load JavaScript modules or the service worker correctly. Python is only a preview server; the deployed app needs no Python or Node.js.

## Use the studio

- **Chord explorer:** choose a root (including alternate sharp/flat spellings), one of 13 chord qualities, inversion, root octave, and close/open voicing. The warm-white grand staff and keyboard follow the exact same notes. Note-name and key-label switches persist locally. Tap or focus and press a piano key to hear it. Sound starts only after interaction.
- **Progression studio:** add the current explorer chord, select a chord to inspect it, duplicate, remove, or move it using the arrow buttons. Load a sample or build your own sequence. Play once at 40–180 BPM, four beats per chord, with block or eighth-note broken chords and an optional metronome. Pause silences playback; Resume begins the paused chord again. Stop returns to the beginning. Changing playback settings stops playback before applying them.
- **Transpose:** shifts the entire progression by a semitone. Smooth inversions chooses nearby close voicings after the first chord; turn it off to keep existing inversion and octave settings. Root choices favor flats in flat keys. Transposition preserves pitch classes; crossing a pitch-class boundary may change the root's octave rather than shift every voice literally by one semitone.
- **Save:** name a progression and save it on this device (up to 50 saves, 64 chords each). Saving the same name replaces that named save. Loading a preset replaces the working sequence, leaving named saves intact. The working sequence also survives reload. No data syncs between devices; clearing browser/site data removes it.
- **Practice:** read the chord and staff, try it on your own instrument, then reveal the keyboard. Next chord gives another prompt. There is no automatic grading, microphone, or MIDI permission.
- **A moment with Bach:** hear and read C4–E4–G4–C5–E5 from the opening C major harmony of BWV 846. Playback continues the upper G4–C5–E5 figure with the lower tones sustained. This is a short learning example, not a complete score.

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

- All 9 Node test groups passed, including exhaustive construction checks.
- Chromium smoke tests passed at the site root and a GitHub Pages-style repository subpath, including 320px/390px overflow checks with no JavaScript page errors, including offline reload and persisted saves.
- Actual iPhone Safari, VoiceOver, Home Screen installation, and subjective sound quality still need the manual checks above.

## Project layout

- `js/theory.js` — spelling, MIDI conversion, chords, inversions, transposition, voice leading.
- `js/notation.js` — dependency-free SVG grand staff, clefs, ledger lines, accidentals, and labels.
- `js/audio.js` — gesture-activated Web Audio synthesis and voice cleanup.
- `js/storage.js` — defensive local preferences and progression persistence.
- `js/app.js` — accessible controls, keyboard, progression transport, practice, and installation.
- `manifest.webmanifest`, `service-worker.js`, `icons/` — installable offline app shell.

## First-version boundaries

The sound is a lightweight synthesized piano-like tone, not a sampled Roland instrument. Notation is a chord-learning grand staff, not a full engraving/score editor: stems point up, there are no key signatures, and the Bach figure is an instructional excerpt without complete rhythmic engraving. Playback is one pass, not a loop; pause restarts the current chord. Voice leading uses nearest-tone distance rather than formal four-part harmony rules. Saves are device-local with no export/sync or recovery after browser data is cleared. No MIDI input, listening analysis, or performance grading is included.
