# JLK Piano Studio 1.2.1 — focused navigation review

Based on `main` commit `4e5f2b4` (the merged 1.2 design), on branch `fix/focused-navigation-v1.2.1`. The approved colors, background, typography, cards, ivory score and piano highlights remain in place. This patch changes navigation and content placement.

## iPhone-sized review captures

Actual Chromium application state at 390 × 844. Full-page captures show the complete primary screen; task captures show the real full-screen view at the device viewport size. The Bach task scrolls within its view, so a second capture shows its playback controls.

| Screen | Screenshot |
| --- | --- |
| Explore | [Main musical workspace](screenshots/v1.2.1/explore-mobile.png) |
| Chord Editor | [Full-screen editor](screenshots/v1.2.1/chord-editor-mobile.png) |
| Progressions | [Focused sequence playback](screenshots/v1.2.1/progressions-mobile.png) |
| Practice | [Current exercise and actual note attempts](screenshots/v1.2.1/practice-mobile.png) |
| Bach Study | [Score and keys](screenshots/v1.2.1/bach-study-mobile.png) · [Playback controls](screenshots/v1.2.1/bach-playback-mobile.png) |

## What moved

- **Explore:** chord title/notes, notation, keyboard and compact playback remain primary. The editor, theory card and Bach lesson content are no longer appended to the page. Two compact links open theory and Bach; the existing ellipsis opens the editor.
- **Chord Editor:** a distinct full-screen task on iPhone, with root, quality, inversion, octave and voicing, a live chord-name preview, and Add to progression. Changes apply to the existing chord and preferences immediately. Back/Done returns to the previous workspace or parent task. There is no second chord state to synchronize or cancel.
- **Theory:** its own information view with the existing formula, intervals and explanation.
- **Bach:** its own score, shared keyboard, play/replay/stop, tempo, loop and feedback. Returning stops the study and restores the chord keyboard; the chord configuration is retained. The rhythm remains the existing explicitly simplified study.
- **Progressions:** normal playback shows sequence title/key, cards and the sequence transport. It does not append the whole Explore workspace. View selected chord opens the shared notation/keys and moves the same transport alongside them without interrupting a running sequence. Edit sequence is a separate state with reorder/duplicate/remove, new chord, pattern/key/metronome, transpose, voice leading and Clear. Its nested chord editor returns to editing after Add or Done.
- **Library / Save:** a focused view for actual presets and device-local saves, including load, naming, open and delete. Existing saved data remains available; errors stay in the library until resolved/dismissed.
- **Practice:** only its score, keyboard, actual progress/instructions, hint/reveal/reset/next, and replay controls. No editor, theory lesson or Bach content is expanded beneath it.
- **Sound Settings:** a dedicated task reached through Sound or an error's recovery action. Returning from nested recovery goes back to the task that failed, preserving its error until a successful retry or dismissal.

## Return behavior and implementation

`js/layout.js` owns one native modal dialog and a lightweight same-document history stack. On iPhone it fills the viewport; desktop uses a restrained centered task card. Native modal semantics, explicit Tab containment, Escape, Back/Done, browser Back/Forward, focus restoration and scroll restoration are exercised. Body scroll is locked only while a task is open. Each task has its own scroll position; opening a nested editor or recovery view returns to that position. No decorative animation or framework is added.

Panels, the score, keyboard, chord cards and transports are **moved, never cloned**. They retain their existing IDs, event handlers and application state. Discarded forward-history frames are pruned when a new task branch is opened. There are no duplicate audio engines, controls or persistent stores. Editing/study navigation stops via the existing transport; observational progression visualization remains live.

`js/audio.js`, `js/playback.js`, `js/exercises.js`, `js/theory.js` and `js/storage.js` are unchanged from the base. The app integration changes only view lifecycle, editor preview, return routing, and keeping the shared keyboard/status appropriate to the active view. Existing preferences and saves keep the `jlk-studio-v1-` namespace. Reload returns to Explore with saved preferences; task history itself is not persisted as user data.

## Validation

- All 27 Node theory/audio/scheduling/practice/persistence tests pass.
- Existing smoke, full-progression audio-graph, and integration/offline-upgrade browser suites pass with updated public navigation steps; their functional assertions remain.
- The navigation suite checks the full-screen editor, every editor field, modal focus containment, root scroll/focus restoration, browser Back/Forward, Escape, nested recovery and nested chord editing, state and preference preservation, real practice attempts across editor returns, library validation/save/load/delete, sequence visualization without interrupted playback, pause/resume/stop, and offline editor/library/Bach/chord playback.
- Primary/task widths checked at 320, 390, 430, 768 and 1440px, with no horizontal page or task overflow. GitHub Pages-style repository-subpath hosting is checked.
- The cache is `jlk-studio-v1.2.1`; task navigation uses the already cached layout module and same `index.html` route. Close old windows/Home Screen instances and reopen online to activate the new worker before testing offline.
- Git whitespace checks pass; the protected core modules have no diff against the main-branch base.

Physical iPhone Safari/Home Screen validation of this navigation patch is **not performed** here. Repeat native select/keyboard handling, safe-area and keyboard viewport sizing, VoiceOver, touch/back-swipe behavior, audio after app switching, and offline update checks on a device. Browser audio-graph activity does not prove physical audibility.

No repository CI workflow is present in the base checkout. Remote CI/PR API access has previously been denied (`Post https://api.github.com/graphql: Forbidden`); the denied route is not blindly retried or broadened for this patch. Local verification and remote Git commit verification are reported separately from CI. Nothing is merged or deployed automatically.
