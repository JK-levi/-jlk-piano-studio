# Create meter support — local review

This update adds 4/4, 3/4, 6/8 and 12/8 to the existing Create Sheet Music editor. It also replaces date-based book version labels with **Second Edition**. The approved design, progression playback and book content remain intact. There are no new runtime dependencies or services.

## Writing and listening

Choose **Time signature** in Create. A new, empty, unsaved piece can change meter directly. Both hands have independent timelines within each measure, up to eight measures per piece. Manual notes, rests, chord events, optional suggestions and explicit insertion remain available. Suggestions use the selected meter's position and capacity; previews never insert notes.

| Meter | Capacity per hand per measure | Tempo and metronome pulse | Count |
| --- | --- | --- | --- |
| 4/4 | Four quarter notes | Quarter note; four pulses | 1–2–3–4 |
| 3/4 | Three quarter notes | Quarter note; three pulses | 1–2–3 |
| 6/8 | Six eighth notes | Dotted quarter; two pulses | 1-la-li · 2-la-li |
| 12/8 | Twelve eighth notes | Dotted quarter; four pulses | 1-la-li · 2-la-li · 3-la-li · 4-la-li |

Tempo remains 40–180 BPM. For example, at 120 BPM in 6/8, six eighth notes occupy one second: each dotted-quarter pulse lasts half a second. The first metronome pulse of each measure is accented. The tempo label and score metadata identify the pulse unit. Unwritten time remains silent; saving does not fill it automatically.

Available values include eighth, quarter, dotted quarter, half, dotted half, whole and dotted whole notes/rests. Insertion checks the available duration for the selected hand and bar. Eighth notes beam by quarter-note pulse in simple meter and in groups of three per dotted-quarter pulse in compound meter. These are ordinary eighth notes, not triplets. Accidentals, note labels and the two staves retain their pitch mapping.

The existing scheduler receives a meter-aware plan. Its engine and clock are unchanged. Score/keyboard highlights and measure counts follow that clock. Longer measures scroll inside the score card, with a visible hint and playback following the current sounding note; the page itself does not overflow. Print output fits the score to the page.

## Changing an existing piece safely

Changing a written or saved piece's meter creates a new editable copy. The original remains in **My pieces**; if the working original has unsaved changes, a separate snapshot preserves those changes without overwriting the previously saved piece. The copy records its original reference and retains every event, duration, hand and measure boundary. Nothing is automatically re-barred, shortened or dropped.

The numeric tempo is retained. Switching between quarter-note and dotted-quarter pulse units therefore changes playback speed; a visible explanation asks the user to adjust tempo if needed. This is a change in pulse interpretation, not an automatic rhythmic arrangement.

Overfilled hand-measures remain visible in their original bars and have prominent, actionable links to their entries. The copy is labeled as an editable draft. Delete/reinsert entries to repair it; Undo is available for editing. **Save draft copy** preserves unresolved work locally. Reloading and reopening retain it. Once repaired, **Save piece** promotes it to the regular piece library.

Invalid copies cannot use whole-piece playback, score printing or JSON export, including through the underlying handlers. Browser printing produces a warning instead of a valid-looking score. Individual note/suggestion previews remain available and are explicitly labeled as previews. Storage failures report a useful error and do not silently replace the current source document.

Existing valid 4/4 saves keep their IDs, timing, storage namespace and fields. A separate `composition-meter-drafts-v1` collection stores editable copies; the existing working-draft key remains in use. Source durations still use quarter-note units; only the playback plan converts them into the selected main pulse. There is no automatic migration that rewrites saved music.

## Book labels and boundaries

The book displays **Second Edition**, including in accessible text and printed pages. Source archives, hashes, dated technical provenance and stable reading-position IDs remain intact. User-authored dates in composition titles are preserved. The source importer extracts ordinal edition names rather than exposing its dated audit label.

The book remains a faithful, reference-only collection: no octaves, performance timing or recordings are invented. Progression presets and guided studies keep their existing timing. This update adds neither automatic re-barring/tied notes nor additional meters, recording transcriptions or a new score engine.

## Validation completed locally

- **52 Node tests passed**, covering theory, audio/playback, persistence, suggestions, book content and meter behavior.
- **Seven Python source-audit tests passed**. Archived sources and their provenance hashes remain unchanged.
- **All ten browser suites passed:** `browser_smoke.py`, `browser_v11.py`, `browser_progression.py`, `browser_design.py`, `browser_discover.py`, `browser_composer.py`, `browser_mobile_corrections.py`, `browser_mobile_update.py`, `browser_book.py` and `browser_meter.py`.
- An additional `browser_mobile_update.py` run upgraded book-inclusive main `d5f8675` from cache `jlk-studio-v1.4` to `jlk-studio-v1.5`. Original composition, working draft, progression, preferences, session and book reading place were retained. A waiting worker did not force activation over an old client. The new composer/book opened offline afterward.
- Meter browser checks covered new-piece selection; copy-first changes; unchanged originals; recoverable overflow and repair/Undo; both-hand audio graph activity and note timing; simple/compound counting and beaming; dotted notes/rests; stopping and highlight cleanup; save/reopen/reload; JSON backup/import; and invalid playback/print/export guards.
- Layout checks covered 320, 375, 390, 393 and 430 CSS-pixel phone widths, landscape, desktop and 200% text. Long-score scrolling stayed contained.
- Actual Chromium PDFs were generated for 3/4, 6/8 and 12/8 and checked with `pdftotext`; the 12/8 page was also rasterized and visually inspected. Invalid-draft printing showed the warning only. A user-authored dated title remained in print output.
- Book screen/accessibility/print checks confirmed **Second Edition**, all 456 source chord rows, 116 blocks and six technique pages, with internal provenance dates retained.

Run the browser tests against an HTTP preview with `JLK_BASE_URL` set to the site's repository subpath. Playwright, Chromium and PDF inspection tools are development-only. No package installation is needed for `npm test`.

Physical iPhone Safari/Home Screen testing has **not** been performed for this update. Chromium emulation, measured audio graph activity and passing PDF tests cannot establish actual iPhone audibility, native printing, VoiceOver behavior, safe-area behavior or installation/update reliability. Those remain device release checks.

## Review captures

- [3/4 on iPhone-sized viewport](screenshots/meter/three-four-iphone.png)
- [6/8 with grouped eighth notes](screenshots/meter/six-eight-iphone.png)
- [12/8 with a contained wide measure](screenshots/meter/twelve-eight-iphone.png)
- [Updated book label](screenshots/keyboard-book/viva-la-vida-iphone.png)

Prepared for review on `feat/create-meter-support`, based on book-inclusive main `d5f8675f9af9f5c19b788e6615bb24355174b216`. The user authorized feature-branch publication and will finish the pull request and merge on GitHub. No automatic merge or deployment is part of this changeset.
