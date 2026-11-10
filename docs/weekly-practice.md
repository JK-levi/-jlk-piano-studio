# Weekly Practice 1.4

This additive feature starts from main 074541a (app 1.5). Meter support and all earlier tools remain. The app release number is not downgraded; the worker is `jlk-studio-v1.5-weekly-1.4`.

## Historical import report

No complete original exports were supplied. November 8 is substantially complete verified material; July 12 and July 19 are partial verified records. Their original supplied excerpts remain readable verbatim alongside structured data. No access to private ChatGPT conversations or automation history is claimed.

| Publication date | Imported content |
|---|---|
| 2026-07-12 | Partial: Finding an Idea and Letting It Evolve |
| 2026-07-19 | Partial: Movement Through Suspended Harmony |
| 2026-07-26 | Original content required |
| 2026-08-02 | Original content required |
| 2026-08-09 | Original content required |
| 2026-08-16 | Original content required |
| 2026-08-23 | Original content required |
| 2026-08-30 | Original content required |
| 2026-09-06 | Original content required |
| 2026-09-13 | Original content required |
| 2026-09-20 | Original content required |
| 2026-09-27 | Original content required |
| 2026-10-04 | Original content required |
| 2026-10-11 | Original content required |
| 2026-10-18 | Original content required |
| 2026-10-25 | Original content required |
| 2026-11-01 | Original content required |
| 2026-11-08 | Substantially complete: Week 11 — 80s Synth-Pop |

## Add a lesson without changing code

Open Weekly Practice → Import a Lesson. Paste authentic text or select `.md`, `.txt` or `.json` (up to 1 MB). For plain text/Markdown, supply the publication date, exact original title, source description and completeness. The stable ID defaults to `weekly-YYYY-MM-DD`. Review, then import. Markdown is retained and displayed as safe readable text, not executable HTML. Text imports do not guess notes or timing.

For interactive data, download `data/weekly-november-8.example.json` from the import screen. Edit a copy with authentic source data. Required version-1 fields:

- `schemaVersion`: 1; `id`: stable `weekly-...` identifier; `date`: real YYYY-MM-DD publication date; `title`: original heading; optional `weekLabel`.
- `originalText`: nonempty full original text, never silently regenerated from structured exercises.
- `source`: `{ "description": "authentic export filename/source", "completeness": "complete|substantially-complete|partial" }`.
- `sections`: ordered array with unique `id`, `title`, `instructions`, and optional `rows`.
- Optional `durationMinutes`, `bpm` (40–180 or null), `style`, `goal`. Keep ranges and unknown details in the original text.
- Each row: `lh` and `rh` arrays of spelled pitches such as `B♭`, `C#4`, `F3`; empty array means no notes. Note order, spellings, octaves and hand assignments are retained. Optional `variation` holds beat-four RH notes.
- Supported `pattern`: `sequence` for individual note audition without inferred timing; `synth-pop` for the exact November 8 eight-count rhythm. Other rhythms stay readable until a future schema explicitly supports them. No generic chord-symbol-to-voicing conversion occurs.
- Voice/settings guidance, drum links, listening links, optional variations and arbitrary original instructions remain in section instructions and originalText. Unknown fields survive JSON storage.

Validation rejects invalid dates, duplicate section IDs, malformed pitches, unsupported patterns and invalid tempos. Missing octaves generate review warnings and require explicit practice-register selection before audition. An existing ID updates content without deleting favorites or completed sessions; conflicting IDs for one date are rejected. Preserve section IDs when revising a lesson. Content and progress use dedicated keys, never existing progression/composition keys. Imports are device-local, work offline and do not publish to other devices. Keep original files as backups. Browser storage failure is shown; no successful import is claimed.

## Playback and source uncertainty

November 8 timing uses the existing audio engine and look-ahead scheduler: LH on at beat 1/off at final &, RH on at 1, & after 2, 4, each held for half a beat. Four clicks count in; Repeat includes the count-in on each cycle. Melody variation changes only the third RH hit. Slower tempo does not change beat proportions. Backgrounding and navigation cancel pending and active playback.

No source octaves were provided. Users explicitly choose practice octaves per hand. Each pitch class is placed in that chosen octave; the app does not invent an ascending voicing across octave boundaries. The notation is an audition reference, not an authenticated source score. Warm-up has individual note audition only. The chord-shape hold instruction remains readable; its imprecise “just before” release is not converted into a fabricated precise rhythm. Partial historical sections have no generated playback.

The GO:KEYS 3 tone names and historical instructions are preserved. Device-specific steps are visibly labeled unverified, with a link to official manuals; no claim of technical verification is made. External YouTube/Apple Music media requires connectivity; lessons, local progress and synthesized playback work offline after cache installation.

## Personal practice

Section completion, current section, favorites and dated completed sessions are saved independently from content. Restart clears only the current attempt; completed sessions remain. A finished lesson reopened for practice begins a new attempt. No grades, mastery or fabricated history. Different lessons retain separate progress.

## Verification

Run `npm test`, `python3 -m unittest discover -s tests -p 'test_*.py'`, and the browser suites against `npm run serve`. `tests/browser_weekly.py` captures home, lesson, rhythm, archive and import at an iPhone-sized viewport. Real iPhone Safari, Home Screen audio routing and touch/VoiceOver remain physical device checks. Close old app windows and reopen to activate the updated service worker. No merge or deployment is part of this change.

Validation for this implementation: 57 Node tests, seven Python source-audit tests, and all 11 Chromium browser suites passed. An additional service-worker upgrade from main `074541a` / `jlk-studio-v1.5` preserved existing compositions, drafts, progressions, preferences, session and book position byte-for-byte and opened the composer offline. Browser assertions cover 320/390/768/1280px widths, actual playback state, source ambiguity, section navigation, repeat completion, favorites, save/reload, duplicate upsert, existing-tool access and offline weekly content. The screenshots are in `docs/screenshots/weekly/`. These checks do not constitute physical Safari/device testing. Retrieval of the official Roland manual was unavailable in this environment; its setup steps remain explicitly unverified historical text.
