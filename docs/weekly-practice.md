# Weekly Practice 1.4

The current library contains all **18 complete originals**, July 12–November 8, 2026. See the [complete import report](complete-weekly-import-report.md) for file mappings, new structured exercises and unresolved source details. The original twelve records and November 8’s interactive rhythm are unchanged. Cache: `jlk-studio-v2-3`.

## Add a lesson without changing code

Open Studio Menu → Previous Lessons → Manage lessons → Import a Lesson. Paste authentic text or select `.md`, `.txt` or `.json` (up to 1 MB). For plain text/Markdown, supply the publication date, exact original title, source description and completeness. The stable ID defaults to `weekly-YYYY-MM-DD`. Review, then import. Markdown is retained and displayed as safe readable text, not executable HTML. Text imports do not guess notes or timing.

For interactive data, download `data/weekly-november-8.example.json` from the import screen. Edit a copy with authentic source data. Required version-1 fields:

- `schemaVersion`: 1; `id`: stable `weekly-...` identifier; `date`: real YYYY-MM-DD publication date; `title`: original heading; optional `weekLabel`.
- `originalText`: nonempty full original text, never silently regenerated from structured exercises.
- `source`: `{ "description": "authentic export filename/source", "completeness": "complete|substantially-complete|partial" }`.
- `sections`: ordered array with unique `id`, `title`, `instructions`, and optional `rows`.
- Optional `durationMinutes`, `bpm` (40–180 or null), `style`, `goal`. Keep ranges and unknown details in the original text.
- Each row: `lh` and `rh` arrays of spelled pitches such as `B♭`, `C#4`, `F3`; empty array means no notes. Note order, spellings, octaves and hand assignments are retained. Optional `variation` holds beat-four RH notes.
- Supported `pattern`: `sequence` for individual note audition without inferred timing; `synth-pop` for the exact November 8 eight-count rhythm; `country` for September 27’s alternating LH/RH beat hits released on each following &. Other rhythms stay readable until a future schema explicitly supports them. No generic chord-symbol-to-voicing conversion occurs.
- Voice/settings guidance, drum links, listening links, optional variations and arbitrary original instructions remain in section instructions and originalText. Unknown fields survive JSON storage.

Validation rejects invalid dates, duplicate section IDs, malformed pitches, unsupported patterns and invalid tempos. Missing octaves generate import-review warnings. Audition uses remembered practice registers (LH 3 / RH 4 by default), adjustable in Settings; these never change source pitches. An existing ID updates content without deleting favorites or completed sessions; conflicting IDs for one date are rejected. Preserve section IDs when revising a lesson. Content and progress use dedicated keys, never existing progression/composition keys. Imports are device-local, work offline and do not publish to other devices. Keep original files as backups. Browser storage failure is shown; no successful import is claimed.

## Playback and source uncertainty

November 8 timing uses the existing audio engine and look-ahead scheduler: LH on at beat 1/off at final &, RH on at 1, & after 2, 4, each held for half a beat. Four clicks count in; Repeat includes the count-in on each cycle. Melody variation changes only the third RH hit. Slower tempo does not change beat proportions. Backgrounding and navigation cancel pending and active playback.

No source octaves were provided. Remembered practice octaves default to LH 3 / RH 4 and can be changed in Settings. Each pitch class is placed in that chosen octave; the app does not invent an ascending voicing across octave boundaries. The notation is an audition reference, not an authenticated source score. Warm-up has individual note audition only. The chord-shape hold instruction remains readable; its imprecise “just before” release is not converted into a fabricated precise rhythm. Partial historical sections have no generated playback.

The GO:KEYS 3 tone names and historical instructions are preserved. Device-specific steps are visibly labeled unverified, with a link to official manuals; no claim of technical verification is made. External YouTube/Apple Music media requires connectivity; lessons, local progress and synthesized playback work offline after cache installation.

## Personal practice

Section completion, current section, favorites and dated completed sessions are saved independently from content. Restart clears only the current attempt; completed sessions remain. A finished lesson reopened for practice begins a new attempt. No grades, mastery or fabricated history. Different lessons retain separate progress.

## Verification

Run `npm test`, `python3 -m unittest discover -s tests -p 'test_*.py'`, and the browser suites against `npm run serve`. `tests/browser_weekly.py` captures home, lesson, rhythm, archive and import at an iPhone-sized viewport. Real iPhone Safari, Home Screen audio routing and touch/VoiceOver remain physical device checks. Close old app windows and reopen to activate the updated service worker. No merge or deployment is part of this change.

Validation for this implementation: 57 Node tests, seven Python source-audit tests, and all 11 Chromium browser suites passed. An additional service-worker upgrade from main `074541a` / `jlk-studio-v1.5` preserved existing compositions, drafts, progressions, preferences, session and book position byte-for-byte and opened the composer offline. Browser assertions cover 320/390/768/1280px widths, actual playback state, source ambiguity, section navigation, repeat completion, favorites, save/reload, duplicate upsert, existing-tool access and offline weekly content. The screenshots are in `docs/screenshots/weekly/`. These checks do not constitute physical Safari/device testing. Retrieval of the official Roland manual was unavailable in this environment; its setup steps remain explicitly unverified historical text.
