JLK PIANO STUDIO — EXPANDED WEEKLY PRACTICE SOURCE PACK

12 complete dated lesson originals are in originals/.
11 JSON lesson records in ready_to_import/ use the app's version 1 weekly schema.
The Nov 8 original is in originals/, but deliberately has no replacement JSON.
Codex must patch its existing record and preserve the validated interactive
November 8 timing/row structures already deployed.

Six dates still lack original lessons: 2026-08-09, 2026-08-16, 2026-08-23, 2026-09-13, 2026-09-20, 2026-09-27.

Important: dates were verified from earlier conversation lesson records,
not inferred from the titles or week numbering.

The uploaded source documents are preserved under references/.
They overlap heavily. Deduplicate by publication date and stable lesson ID.
The undated Sample Week Warm, Groovy R&B is a demo, not Aug 30.
Do not merge its different chord voicings with the Aug 30 actual lesson.

Import notes:
 - originalText holds the full user-supplied lesson for every date.
 - Sections are divided without paraphrasing their instructions.
 - Some explicit chord/warmup note rows are structured for audition.
 - Unknown octaves must be chosen by the player. No source octaves invented.
 - Advanced beats, releases, LH/RH split and expressive guidance remain
   preserved as prose unless a validated interactive pattern is implemented.
 - Preserve users' favorites/completion and all current app features.
 - Verify each JSON with the app's validateLesson and browser tests.
