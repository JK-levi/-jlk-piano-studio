# iPad usability review

Built from main `7e8a2bc` on `feat/ipad-composer-archive`. PR #17 was merged; PR #16 was closed, and its work was included in #17. There were no open PRs when implementation began. No merge or deployment is part of this change.

## PR #18 review follow-up

Rechecked remote `feat/ipad-composer-archive` before editing: its head was the reviewed `7888a8fa5a8a887da6123d1bdb5fe14b333ee243`, with no subsequent changes. The base remains `7e8a2bc8948f82c29928723e77805436986d35d6`. These fixes update the existing PR; nothing was merged or deployed.

- **Personal lessons on newly bundled dates:** startup now reconciles by stable ID. A personal August 9 lesson and canonical `weekly-2026-08-09` both remain openable, with independent progress. Ordinary imports still reject conflicting IDs on a date. Same-ID customizations stay authoritative; unchanged older bundled copies still upgrade. No content migration or progress rewrite occurs at startup.
- **Redo after metadata edits:** accepting an actually changed title, tempo, key or metronome value clears Redo immediately. Title input branches history before blur without adding an Undo step per character. Unchanged metadata reads, score selection, settings, preview and Save preserve Redo. Meter changes retain their existing copy/history behavior.
- **Import navigation:** successful save awaits the shared Back transition to the invoking archive, then displays success feedback. It neither pushes nor replaces another archive entry. Refresh restores the archive; one app Back or browser Back returns Home. Validation/storage failures leave the form and entered text in place.

### Reproduction and verified outcomes

The new regressions were run against the reviewed implementation before applying these fixes. The model test failed on the duplicate date. The browser upgrade test imported a valid personal lesson through the **actual base UI**, then reproduced the startup error: `This date already uses ID weekly-2026-08-09`. The editing/history suite produced six expected failures: all four metadata cases allowed destructive Redo, and both import navigation cases reopened Import after refresh. After the fixes all these regressions pass.

The base UI accepted **13** lessons: its original twelve plus “My August bass study,” ID `weekly-my-august-practice`, dated August 9, with custom text and exact D♭3/A♭3 and F4/C5 notes. The test favorited it and completed its first section through the UI, then captured raw content and progress before upgrading. The upgraded archive contains **19** lessons. Both same-date entries open with their own title, pitches, favorite and completion state. Read-only upgrade, opening both entries, and online reload leave the entire stored content and progress strings byte-for-byte unchanged. Deliberately advancing the canonical lesson changes only its own progress. Offline reload retains both records and the personal progress exactly. A clean install still has **18**, with November 8 latest.

See the [captured upgrade evidence](pr18-review-upgrade-evidence.json) for the personal record, progress before/after and matching content hashes. The reproducible test writes complete raw captures to `/tmp/jlk-pr18-review/personal-before-upgrade.json` and `personal-after-offline.json`. No historical lesson data files changed; the model test additionally compares all twelve original bundled records against the base, including November 8's section IDs and rhythm. The existing source audits check the six additions and supplied note rows.

In the composer, Delete → Undo → rename leaves Redo disabled and the new title in both the field and persisted draft after reload. Tempo 112, key Dm and metronome changes behave the same way. With no document edit, Delete → Undo → Redo still deletes correctly; suggestion preview keeps Redo available and does not insert anything. Existing tests retain chord-tone deletion, scoped clearing, Undo and saved-copy preservation.

For Home → Previous Lessons → Import → successful save, the new card and success message are visible on the archive. Refresh stays there. Separate runs confirm one in-app Back and one browser Back each return Home. Invalid JSON and a simulated storage failure retain the unfinished form; Back still restores its invoking archive.

### Follow-up validation

System Chromium 154 through Python Playwright; all commands below and all eight existing browser commands in the Validation section completed successfully. New regression screenshots and run logs are written outside the repository under `/tmp/jlk-pr18-review`.

```sh
# New focused model and browser regressions
node --test tests/pr18-review.test.js
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_review_regressions.py
python3 tests/browser_personal_upgrade.py

# Reproduce the upgrade failure against the reviewed commit (expected failure)
JLK_UPGRADE_TARGET=7888a8fa5a8a887da6123d1bdb5fe14b333ee243 python3 tests/browser_personal_upgrade.py
```

Results: **75 Node tests**, **7 Python source audits**, **all eight existing browser suites**, the **four new browser regression methods (including their subcases)**, and the **real base-to-current personal-archive upgrade** pass. Service-worker cache `jlk-studio-v2-3` waits for the old client to close and preserves existing storage; the offline composer opens and plays. `git diff --check` passes.

**Merge recommendation:** ready for review and merge based on these results. No known blocker remains for the three review findings. Physical iPad/iPhone Safari audio, Home Screen appearance, VoiceOver and AirPrint remain device checks, not claims established by Chromium. Merge and deployment remain the owner's decision.

## Visible corrections

| Screenshot evidence | Implemented correction |
|---|---|
| Home ends in a large light band | The body now fills the viewport; the root canvas matches Home through the safe-area/overscroll region. Legitimate content is not clipped. |
| Ivory JLK vanishes against the light Explorer/Progressions background | The logo uses graphite on light pages and ivory on Home, retaining its serif lettering and glint. |
| “Audio ready” stays under every page | Normal state is silent. Recovery feedback clears after three seconds; genuine failures stay actionable. The recovery button is fixed to the viewport and avoids Done on phones. |
| Back from library/composer returns to an unrelated area | A serializable navigation snapshot owns the base route, task stack and overlay. Tool opening preserves its invoking page. Reload restores that history. |
| Settings, prose and status blocks precede the score | Composer opens to score + note entry. Piece Settings and My Pieces / Backups have separate tabs; meter explanations are collapsed. iPad uses two columns, iPhone one compact column. |
| No obvious way to delete written notes | Click/tap or keyboard-select a score event. Its editing drawer opens with Delete Note/Selection, optional individual chord-tone selection, and scoped Clear Hand/Measure. Undo/Redo remain beside Play and Save. |
| Suggestions consume an entire screen | A contextual Suggestions tab retains the score, offers compact preview buttons and separate Add/Insert actions, and collapses “Why?” explanations. |

The vinyl proportions, triangular-dot menu, graphite/ivory/champagne palette, original music data, shared scheduler, score renderer, saved-data model, and PWA remain in use. The initial score is visible without scrolling past piece metadata. The before/after screenshots below are actual browser captures, not mockups.

## Confirmed navigation and editing

- Home → record → current lesson → Back → archive → Back → Home. Refresh within a lesson retains the current section.
- Home → Progressions → My Progressions → Back → Progressions → Back → Home, including refresh inside the library.
- Composer opened from Home returns to Home; the broader composer regression also opens it from Explorer. Done and browser Back use the same history. Reload retains the draft and the invoking page.
- Closing Studio Menu preserves the exact score selection. Browser Back closes the overlay without navigating away. Nested Guided Studies → Book → Back restores Guided Studies.
- Selecting an event exposes deletion. Removing one chord tone preserves its duration and other pitches; deleting a whole event uses the existing sequential model, closing only that hand's gap. Unrelated hands/measures stay unchanged. Undo and Redo restore snapshots.
- Clear Hand/Measure confirms the current scope; Clear Working Piece confirms all working notes. Saved copies are untouched until the user deliberately saves or deletes a copy.
- Suggestion previews schedule sound but do not write. Explicit chord/note insertion, tempo changes, saving, reopen, backups, printing and offline playback all work.
- All 18 historical originals open; November 8 remains latest. See the [full import report](complete-weekly-import-report.md).

## Validation

Environment: local HTTP (`127.0.0.1:8003`), system Chromium through the repository's Python Playwright setup. Browser extension tooling was unavailable in this session. Primary captures use the supplied iPad dimensions **960×1280** and **1280×960**, plus **390×844** iPhone. Meter/book regressions also cover 320, 375, 393 and 430 widths, landscape and 200% text. No new dependency was added.

| Check | Result |
|---|---|
| Page identity, meaningful content, no error overlay | Pass |
| Page errors during tested journeys | None |
| Visible before/after changes | Reviewed Home, logo contrast, composer, suggestions, selection, settings and archive |
| Horizontal overflow / long scores | Page and task containers fit; wide 12/8 measures scroll inside the score |
| Unit/source tests | 75 Node tests; 7 Python source-audit tests pass |
| Requested journeys | Pass at all three primary viewports |
| Composer regression | Manual entry, rests/chords, fit errors, Undo/delete, two hands, preview/insert distinction, storage/backups and actual PDF output pass |
| Meter regression | 3/4, 6/8, 12/8, exact oscillator starts, score highlights, invalid-copy safety, explicit repairs and offline playback pass |
| Progression regression | Loop, pause/resume, broken pattern, metronome, silent chord inspection, interruption/rejected audio resume and scoped errors pass |
| Discovery / guided studies | 18 catalogue progressions, four studies, recoverable progression draft and offline use pass |
| Book regression | All 44 content pages, four front/back pages, nested Back/Done/Forward, printing and reading-place preservation pass |
| Studio 2 regression | Vinyl entry, score modes, selected-chord navigation, settings and offline load pass |
| Real worker upgrade | Main `jlk-studio-v2-1` → `jlk-studio-v2-3` under `/piano/`; waits for old client to close, preserves local storage byte-for-byte, reopens composer offline |

Commands (run a local server first):

```sh
npm test
python3 -m unittest discover -s tests
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_ipad_corrections.py
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_composer.py
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_meter.py
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_progression.py
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_discover.py
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_book.py
JLK_BASE_URL=http://127.0.0.1:8003/ python3 tests/browser_studio2.py
python3 tests/browser_mobile_update.py
```

The browser suites were updated to reach controls through Studio Menu and the new composer tabs. Historical screenshot-capture scripts and superseded UI-specific audits are not claimed as current acceptance tests.

## Remaining limitations

Real iPad/iPhone Safari audibility, interrupted audio after backgrounding, Home Screen safe-area behavior, VoiceOver, AirPrint and PWA update activation still need physical-device checks. Chromium emulation and oscillator instrumentation cannot establish these. No WebKit runtime is installed here.

Some source exports contain media/citation IDs without actual URLs. Readable track titles remain, but no guessed links are added. Ambiguous rhythmic releases remain instructions/note studies. Original text stays intact in the data. Full-event deletion keeps the existing sequential editor behavior; it does not introduce arbitrary gaps or a new composition schema.

## Screenshots

### iPad portrait — Home

Before:

![Before Home: light lower band and persistent audio status](screenshots/ipad-corrections/before-ipad-home.png)

After:

![After Home: continuous graphite canvas and quiet audio status](screenshots/ipad-corrections/after-ipad-home.png)

### iPad portrait — composer

Before:

![Before composer: metadata and explanations before score](screenshots/ipad-corrections/before-ipad-composer.png)

After:

![After composer: score and note entry side by side](screenshots/ipad-corrections/after-ipad-composer.png)

### iPad landscape — composer

![Before landscape composer](screenshots/ipad-corrections/before-landscape-composer.png)

![After landscape composer](screenshots/ipad-corrections/after-landscape-composer.png)

### iPhone — composer

![Before iPhone composer](screenshots/ipad-corrections/before-iphone-composer.png)

![After iPhone composer](screenshots/ipad-corrections/after-iphone-composer.png)

### Suggestions

![Before suggestions](screenshots/ipad-corrections/before-ipad-suggestions.png)

![After suggestions with score retained](screenshots/ipad-corrections/after-ipad-suggestions.png)

### Selection, scoped clearing and secondary areas

![Selected written event with Delete and Undo](screenshots/ipad-corrections/after-ipad-selection.png)

![Cleared RH measure with Undo available](screenshots/ipad-corrections/after-ipad-cleared-measure.png)

![Piece Settings](screenshots/ipad-corrections/after-ipad-piece-settings.png)

![My Pieces and Backups](screenshots/ipad-corrections/after-ipad-my-pieces.png)

### Branding and archive

![Before logo contrast](screenshots/ipad-corrections/before-ipad-explore-contrast.png)

![After logo contrast and contextual Back](screenshots/ipad-corrections/after-ipad-explore-contrast.png)

![Before archive with twelve lessons](screenshots/ipad-corrections/before-ipad-archive.png)

![After archive with eighteen lessons](screenshots/ipad-corrections/after-ipad-archive.png)

![Current lesson rhythm workspace](screenshots/ipad-corrections/after-ipad-lesson.png)

![Selected progression chord](screenshots/ipad-corrections/after-ipad-selected-chord.png)

![Studio Menu inside composer](screenshots/ipad-corrections/after-ipad-menu.png)
