# iPad usability review

Built from main `7e8a2bc` on `feat/ipad-composer-archive`. PR #17 was merged; PR #16 was closed, and its work was included in #17. There were no open PRs when implementation began. No merge or deployment is part of this change.

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
| Unit/source tests | 73 Node tests; 7 Python source-audit tests pass |
| Requested journeys | Pass at all three primary viewports |
| Composer regression | Manual entry, rests/chords, fit errors, Undo/delete, two hands, preview/insert distinction, storage/backups and actual PDF output pass |
| Meter regression | 3/4, 6/8, 12/8, exact oscillator starts, score highlights, invalid-copy safety, explicit repairs and offline playback pass |
| Progression regression | Loop, pause/resume, broken pattern, metronome, silent chord inspection, interruption/rejected audio resume and scoped errors pass |
| Discovery / guided studies | 18 catalogue progressions, four studies, recoverable progression draft and offline use pass |
| Book regression | All 44 content pages, four front/back pages, nested Back/Done/Forward, printing and reading-place preservation pass |
| Studio 2 regression | Vinyl entry, score modes, selected-chord navigation, settings and offline load pass |
| Real worker upgrade | Main `jlk-studio-v2-1` → `jlk-studio-v2-2` under `/piano/`; waits for old client to close, preserves local storage byte-for-byte, reopens composer offline |

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
