# JLK Piano Studio 1.2 — design review

The supplied design board is translated into a functional static app: monochrome flowing folds, front-facing charcoal cards, warm ivory notation, serif musical headings, restrained champagne controls, and fine borders. Its fictional lessons, library, history graphs and mastery percentages are deliberately absent. No current-device audio claim is inferred from a screenshot.

## Screenshots

Captured with Chromium at 390px mobile and 1440px desktop widths. Each screenshot uses real application state: Cmaj7 in Explore, the existing C–Am–F–G preset in playback, and two actually attempted C-major notes in Practice. Screenshots are review artifacts and are not loaded or cached by the app.

| Experience | Mobile | Desktop |
| --- | --- | --- |
| Explore | [View](screenshots/explore-mobile.png) | [View](screenshots/explore-desktop.png) |
| Progressions | [View](screenshots/progressions-mobile.png) | [View](screenshots/progressions-desktop.png) |
| Practice | [View](screenshots/practice-mobile.png) | [View](screenshots/practice-desktop.png) |

## Structure and controls

- **Explore:** current chord and written notes, ivory grand staff, playable keyboard, compact playback bar. The ellipsis opens the native Chord editor; Inside the harmony contains the formula and intervals. A genuine Bach study sits below the essential workspace.
- **Progressions:** a dedicated sequence screen with its own transport, named sequence/key, existing presets, chord cards and Roman numerals, plus the shared score and keyboard for the selected/playing chord. Edit chords reveals move, duplicate and remove actions. Progression settings contains pattern, metronome, analysis key, transpose, smooth voice leading and Clear. Save / Open reveals the existing device-local workflow. The chord editor can still add new chords.
- **Practice:** the same accurate score and keyboard, a focused instruction/progress card, exact-octave attempts, hints, reveal, reset and next chord. The meter is derived only from the current attempt's found-note set. No microphone, external-keyboard detection or accumulated performance score is implied.
- **Sound:** the persistent header button exposes the existing Test Sound and Recover audio controls. Errors stay beside their owning transport and offer a Sound settings action. Save errors reveal their panel. Error alerts and dismissal survive unrelated successes and collapsed panels.

The app uses one score, keyboard, chord editor and study transport. `js/layout.js` owns presentation/navigation/disclosures; it does not create audio contexts or run timers. The existing `js/audio.js`, `js/playback.js`, `js/exercises.js`, `js/theory.js` and `js/storage.js` are unchanged from the main-branch baseline. Notation changes are horizontal spacing only; pitch/staff math and rhythm construction remain intact.

## Performance and accessibility

No framework, runtime dependency, remote font, video, WebGL, blur filter, or decorative animation loop is introduced. `assets/studio-waves.svg` is a small stationary background made from simple gradients and paths. System typography, reusable CSS tokens, component rules and responsive layouts keep rendering inexpensive. The ivory score and warm key illumination remain readable against opaque surfaces.

Controls retain 44px minimum targets (piano keys retain their physical proportions), 16px form values prevent Safari input zoom, safe-area padding supports the Home Screen app, native details support keyboard interaction, and reduced-motion preferences disable transitions. Errors use an explicit label/icon, alert semantics, high-contrast surfaces and dismissal; field validation remains linked with `aria-describedby`/`aria-invalid`. Normal playback status omits engine diagnostics and failed validation cannot retain Complete.

## Validation

- `npm test`: all 27 theory/audio/scheduling/practice/persistence tests passed.
- Existing smoke, v1.1 integration and full-progression graph suites: passed after adapting navigation/disclosure steps, keeping their functional assertions.
- `tests/browser_design.py`: all three focused screens, every existing control plus new layout controls, label/editor/theory options, audio synchronization, Roman numerals, save/open/delete/reload, actual practice progress, all screenshot states, keyboard access and reduced motion.
- Layouts checked at 320, 375, 390, 430, 768 and 1440px with no horizontal page overflow.
- Offline worker replacement, legacy saves, navigation, new shell/background assets and offline playback checked. Cache is `jlk-studio-v1.2`; local storage keeps its `jlk-studio-v1-` namespace. A session-title metadata key is additive.
- GitHub Pages project-subpath hosting and whitespace checks passed.

The working audio behavior was confirmed by the user on a physical iPhone before this visual release. This release has browser automation and visual checks, not a new physical iPhone test. Before release, repeat portrait/landscape, safe-area, VoiceOver/larger-text, touch playing, Safari/Home Screen audio/recovery, Bluetooth routing, loop timing and offline-update checks on a device. A conditional install-button test is not proof of actual Home Screen installation.
