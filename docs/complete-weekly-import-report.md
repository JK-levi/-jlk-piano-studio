# Complete weekly archive — import report

The archive now contains **18 original weekly lessons**, one per Sunday from July 12 through November 8, 2026. There are no missing dates and no duplicate IDs or publication dates. The original 12 JSON records are unchanged from main `7e8a2bc`, including every November 8 section ID, shape, onset, release, variation and tempo.

Source: `JLK_6_Missing_Weekly_Lessons.zip`, SHA-256 `57e7472a686b4766707c1f760d0e87571b67c0baae9a0592f64375c60929afc0`. The complete extracted package is retained in [final-six](../data/weekly-sources/final-six/): original Markdown files, untouched supplied JSON, manifest and README. Supplied documentation was treated as source material, not repository instructions.

## Archive mapping

Each stored ID is `weekly-` followed by the publication date. Dates and original titles remain internal; cards use clean display titles.

| Date | Original title | Action | Original text source |
|---|---|---|---|
| 2026-07-12 | Finding an Idea and Letting It Evolve | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-07-12.txt) |
| 2026-07-19 | Movement Through Suspended Harmony | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-07-19.txt) |
| 2026-07-26 | Layers That Breathe | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-07-26.txt) |
| 2026-08-02 | Tension, Release, and Long Lines | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-08-02.txt) |
| 2026-08-09 | One melody, changing ground | Added | [Original](../data/weekly-sources/final-six/originals/weekly-2026-08-09.md) |
| 2026-08-16 | Make the rhythm part of the composition | Added | [Original](../data/weekly-sources/final-six/originals/weekly-2026-08-16.md) |
| 2026-08-23 | Make the bass change the meaning | Added | [Original](../data/weekly-sources/final-six/originals/weekly-2026-08-23.md) |
| 2026-08-30 | Warm R&B / Late-Night Groove | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-08-30.txt) |
| 2026-09-06 | Cinematic / Slightly Melancholy | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-09-06.txt) |
| 2026-09-13 | 80s synth-pop / open-road feeling | Added | [Original](../data/weekly-sources/final-six/originals/weekly-2026-09-13.md) |
| 2026-09-20 | Disco / ABBA-style pulse | Added | [Original](../data/weekly-sources/final-six/originals/weekly-2026-09-20.md) |
| 2026-09-27 | Country / Americana — steady “boom-chuck” groove | Added | [Original](../data/weekly-sources/final-six/originals/weekly-2026-09-27.md) |
| 2026-10-04 | Melodic House / Electronic Pulse | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-10-04.txt) |
| 2026-10-11 | Week 7 — Brazilian-Inspired Pop | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-10-11.txt) |
| 2026-10-18 | Week 8 — Retro Funk & Soul | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-10-18.txt) |
| 2026-10-25 | Week 9 — Late-Night R&B / Neo-Soul | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-10-25.txt) |
| 2026-11-01 | Week 10 — Cinematic Piano | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-11-01.txt) |
| 2026-11-08 | Week 11 — 80s Synth-Pop | Unchanged | [Original](../data/weekly-sources/originals/weekly-2026-11-08.txt) |

## Structured additions and limits

| Date | Verified improvements | Details left unspecified |
|---|---|---|
| August 9 | Split the four timed practice stages into usable steps; audition the explicitly assigned LH G♭ and E♭ anchors. 27-minute practice sequence. | Full chord hand allocation, octave placement and exact timing remain prose. No automatic chord inversion. |
| August 16 | Added the explicit E♭m9 example: LH E♭–B♭; RH D♭–F–G♭. Four timed practice stages; 27 minutes. | Variable “HIT — rest — HIT” rhythm stays guidance. No invented durations. |
| August 23 | Added RH G♭–A♭–D♭ study and four exact paired voicings, including the unusual B♭/F bass pairing as written. 27 minutes. | Alternative 2/2/4/8-beat holds stay in the original guidance. |
| September 13 | Retained all eight supplied paired rows; added the two explicit RH warm-up sequences. | RH release length in the syncopated variation is not precise enough for a fully timed arrangement. |
| September 20 | Retained all eight supplied paired rows; added the six-note RH warm-up. | “Immediately” released offbeats have no exact duration. They remain guidance and note audition. |
| September 27 | Retained all twelve supplied paired rows; added four RH warm-ups and the four-shape country rhythm. LH on beats 1/3, RH on 2/4, each released on the following &. Uses the source’s 85 BPM backing-track reference. | All octaves remain adjustable practice registers. The later improvised melody is not generated. |

The `country` pattern reuses the existing scheduler and score renderer, with a four-click practice count-in. It does not alter `synth-pop` or November 8. Untimed rows remain **Hear Notes**; only exact verified rhythms show **Play Rhythm**. Sequence auditions do not claim source timing.

`originalText` matches each supplied JSON string exactly. Prepared rows are retained in their original order. Introductory date-only steps are omitted from the interactive presentation; all original text remains archived. Export entity tokens become readable song/artist names, citations are suppressed in presentation, and media tokens retain their descriptive titles. A `turn…` media ID is not a recoverable URL: no fabricated link is displayed.

## Personal data and validation

No local-storage keys, schemas or saved music are migrated or cleared. Bundled additions merge by stable ID. Custom imports remain authoritative. Progress, favorites and completed sessions are stored independently and untouched. The six additions cannot replace November 8 as latest because the library remains ordered by publication date.

Automated checks: 18 valid unique originals; exact text equality; prepared-row preservation; added spelling/hand-order assertions; unknown-octave handling; source-token cleanup; ordered historical dates; duplicate prevention; preservation of custom imports and practice records; unchanged November timing; country onset/release and notation duration checks. Browser checks open all 18 lessons online and load the complete archive offline.
