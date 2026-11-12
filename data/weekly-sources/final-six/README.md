# JLK Piano Studio — Six missing weekly lessons

This package adds the user-supplied original weekly lessons for August 9, 16, 23 and September 13, 20, 27, 2026.

- `originals/` retains each original lesson as Markdown.
- `ready_to_import/` has one existing-schema JSON record per date.
- Every record includes the complete original text and readable practice sections.
- Some exact LH/RH pairs are structured into note rows; other chord suggestions and any ambiguous musical details remain in original text.
- Do not invent missing octave registers, exact tempo, or rhythm patterns; make additional sections interactive only after precise validation.
- Dates are explicit in the user's original document.
- Existing user progress and favorites must survive the import.
- Strip raw scraped reference markup from the presentation layer only, not originalText.
- The app already has an archive and importer: extend it, do not rebuild.

Import Codex integration: verify against the latest `js/weekly-model.js` schema and `data/weekly-lessons.json`, upsert by stable ID.
