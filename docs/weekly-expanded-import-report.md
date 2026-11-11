# Recovered weekly archive

The expanded source pack is preserved under `data/weekly-sources/`: originals, prepared JSON, original uploaded references, manifest, and the separate undated sample. Attached documents were treated as source material, not execution instructions. No sample voicings replace historical voicings.

| Publication date / stable ID suffix | Original title | Result |
| --- | --- | --- |
| 2026-07-12 | Finding an Idea and Letting It Evolve | Expanded partial record; three explicit LH shapes |
| 2026-07-19 | Movement Through Suspended Harmony | Expanded partial record; three explicit LH shapes |
| 2026-07-26 | Layers That Breathe | Imported; three explicit LH shapes |
| 2026-08-02 | Tension, Release, and Long Lines | Imported; three explicit LH shapes |
| 2026-08-30 | Warm R&B / Late-Night Groove | Imported prepared sections and exact rows |
| 2026-09-06 | Cinematic / Slightly Melancholy | Imported prepared sections and exact rows |
| 2026-10-04 | Melodic House / Electronic Pulse | Imported prepared sections and exact rows |
| 2026-10-11 | Week 7 — Brazilian-Inspired Pop | Imported prepared sections and exact rows |
| 2026-10-18 | Week 8 — Retro Funk & Soul | Imported prepared sections and exact rows |
| 2026-10-25 | Week 9 — Late-Night R&B / Neo-Soul | Imported prepared sections and exact rows |
| 2026-11-01 | Week 10 — Cinematic Piano | Imported prepared sections and exact rows |
| 2026-11-08 | Week 11 — 80s Synth-Pop | Replaced originalText/source metadata only |

Every ID is `weekly-YYYY-MM-DD`. Each `originalText` equals the corresponding `originals/weekly-YYYY-MM-DD.txt` verbatim, including trailing whitespace. Eleven prepared records supply the section structure; their source JSON remains untouched for audit. The first four records add only the explicitly assigned LH shapes from section 2, with an empty RH audition and an explanation that the right hand is improvised. July 12/19 retain the prior `source` section ID on their introduction so completion references remain meaningful. November 8 retains every section ID, instruction, shape, variation, pattern, tempo and rhythm event from the previous bundle. Its fuller material is accessible under Full original lesson & source.

Original content is still required for **August 9, 16, 23 and September 13, 20, 27, 2026**. These dates remain in the archive report; no replacement lessons were generated.

## Musical boundaries

Source octave omissions remain omissions. Users explicitly choose practice registers. Auditions preserve note spelling and order without imposing standard chord inversions. Hear These Notes and its optional repetition are illustrative sustained auditions, not reconstructed source rhythms. November 8 retains its exact timed playback, count-in, beat-4 variation and tempo control. Other source rhythm descriptions, BPM ranges, durations, tone suggestions, listening references and creative instructions remain verbatim. No exact release schedule is inferred from prose.

## Storage and compatibility

Progress, favorites and completion history retain their existing storage key. Content import remains available. `previous-bundled.json` records the three older shipped lessons: only exactly unchanged local copies of those records yield to the expanded bundle. Edited/custom imports continue to override bundled records. Local content is not rewritten during loading. Historical imports sort by publication date, so November 8 remains the latest lesson. Future dated lessons can become latest normally.

## Existing corrections retained

Latest main already contained the branded mobile header, accessible Create destination, Settings control, silent previous/next chord inspection, horizontally scrolling chord strip, selected/playing distinction, touch-focus refinement, and actionable composer initialization errors. No replacement composer, state model or audio engine was introduced. Package version 1.5.0 is retained; the weekly refinement does not downgrade it. The PWA cache is incremented to `jlk-studio-v1.5-weekly-expanded-2` and includes migration data for offline use.

## Verification

Node coverage includes all originals, uniqueness, validation, source equality, prepared note arrays, explicit early LH shapes, omitted octave handling, November rhythm equality, chronological ordering and legacy/custom content behavior. Browser archive coverage checks unchanged stored progress/favorites, actual migration, grouped notes, optional registers, highlights, cheat sheet, exact original text and phone widths. Existing browser suites exercise composer suggestions versus insertion, saving/reopening, error paths, progression navigation/playback, offline loading, worker updates and responsive layouts.

Screenshots: `docs/screenshots/weekly/` and `docs/screenshots/mobile-corrections/`.

Physical iPhone checks still required: actual speaker/Bluetooth audibility, Safari audio interruption/recovery, installed Home Screen launch/update/offline behavior, safe-area rendering on a physical notched device, and iOS Dynamic Type. Chromium touch emulation does not establish these results.

Final automated results: **60 Node tests and 7 Python unit tests passed**, plus all **12 browser suites**: archive, weekly, mobile corrections, composer, design/navigation, discovery, meter, mobile update, progression, smoke, v1.1 regressions and keyboard book. Cache fixtures now assert the incremented worker version. The composer browser test explicitly waits for lazy-loaded content before checking saved-library entries after offline reload. No physical-device results are claimed.
