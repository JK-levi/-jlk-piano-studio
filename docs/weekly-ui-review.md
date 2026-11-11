# Weekly Practice UI review

## Visible changes

- Previous Lessons uses a two-column compact tablet grid and a phone list. Cards omit publication dates, week prefixes, source badges and unknown-duration placeholders. They show a title, known duration/tempo, short goal and Start/Continue action. Titles, dates and IDs in the imported records remain untouched.
- Lesson views begin with the title/goal and a compact step selector. Playable paired LH/RH shapes come before supporting prose. A new lesson opens at its first playable exercise; existing progress resumes at its saved step. Other sections remain available in the step selector.
- Hear works immediately with LH 3 and RH 4 practice defaults. Optional Playback settings persist separate hand registers locally. Explicit source octaves still take precedence. The source data is never rewritten.
- November 8 has a compact eight-count guide, Play Rhythm, Repeat and tempo controls, with a current-shape highlight during playback. The scheduler, count-in, release timing and variation are unchanged. Hear remains a note audition; Play Rhythm is the timed action.
- Generic software explanations are removed from practice. Source records, import tools, full text and practice history are under optional disclosure controls. Repeated LH/RH instruction lines are omitted from the presentation only. Exact source text remains in the data and optional full lesson.
- Instructions wrap, long material is grouped into paragraphs and expandable playing guidance, and URLs become descriptive links. Page width is constrained. Errors/playback status sit beside the music controls.
- The already implemented JLK/glint header, Create/Settings destinations, silent progression chord navigation and functional composer are retained and demonstrated below.

## Before / after evidence

These are actual Chromium screenshots of current main before changes and this branch after changes, at 390×844 (iPhone) and 820×1180 (iPad). Lesson views scroll to the practice area on entry so a deep archive position cannot hide the notes. Header and archive captures include the page header. The separate generated concept was illustrative, not verification or lesson data.

The four referenced new iPad attachments were not present in this chat turn. This review therefore uses direct inspection of the current application and the user's written issue list, rather than claiming to have inspected those images.

### Ipad — Previous Lessons

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/ipad-archive.png) | ![After](screenshots/ui-cleanup/after/ipad-archive.png) |

### Ipad — Playable chord lesson

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/ipad-chords.png) | ![After](screenshots/ui-cleanup/after/ipad-chords.png) |

### Ipad — Written rhythm

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/ipad-rhythm.png) | ![After](screenshots/ui-cleanup/after/ipad-rhythm.png) |

### Ipad — Header and Home

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/ipad-header.png) | ![After](screenshots/ui-cleanup/after/ipad-header.png) |

### Ipad — Selected progression chord

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/ipad-progression.png) | ![After](screenshots/ui-cleanup/after/ipad-progression.png) |

### Ipad — Create Sheet Music

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/ipad-composer.png) | ![After](screenshots/ui-cleanup/after/ipad-composer.png) |

### Iphone — Previous Lessons

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/iphone-archive.png) | ![After](screenshots/ui-cleanup/after/iphone-archive.png) |

### Iphone — Playable chord lesson

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/iphone-chords.png) | ![After](screenshots/ui-cleanup/after/iphone-chords.png) |

### Iphone — Written rhythm

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/iphone-rhythm.png) | ![After](screenshots/ui-cleanup/after/iphone-rhythm.png) |

### Iphone — Header and Home

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/iphone-header.png) | ![After](screenshots/ui-cleanup/after/iphone-header.png) |

### Iphone — Selected progression chord

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/iphone-progression.png) | ![After](screenshots/ui-cleanup/after/iphone-progression.png) |

### Iphone — Create Sheet Music

| Before | After |
| --- | --- |
| ![Before](screenshots/ui-cleanup/before/iphone-composer.png) | ![After](screenshots/ui-cleanup/after/iphone-composer.png) |

## Interactions and automated checks

- 63 Node tests: lesson validation/source equality, untouched November rhythm, archive identity/progress handling, register fallback/validation, presentation-only title cleanup, composition, audio scheduling, playback and theory.
- 7 Python unit tests: existing keyboard-book import coverage.
- All 13 browser suites: weekly UI, weekly practice, recovered archive, mobile corrections, composer, design/navigation, discovery, meter, service-worker update, progression, smoke, v1.1 regressions and keyboard book.
- New UI coverage taps Hear without opening settings and observes actual Web Audio oscillator starts, restores changed LH/RH registers after reload, verifies archive density, and expands every section of every lesson at 390 and 820 pixels to check wrapping and descriptive links. Phone widths 320/375/390/393/430, tablet portrait and landscape, and 200% text are checked.
- Existing mobile corrections coverage verifies silent previous/next/direct chord selection, matching score/key pitches, separate selected/playing state, long chord strips, composer save/reopen, Back/Done/Forward, failure messages and offline reopening. Composer coverage checks RH/LH entry, durations, suggestions, preview versus insertion, playback, saved pieces and print output.
- All source lesson JSON, original texts, IDs and musical arrays are unchanged. Existing progress and composition keys are unchanged; playback registers use a new separate key. The worker cache is incremented and includes the new presentation module.

## Visual review and limitations

Reviewed the actual after captures for the archive, chord lesson, rhythm screen, header, chord viewer and composer. Corrected faint archive labels, oversized phone rows, stale scroll position and redundant headings during that review. The iPad archive capture shows six complete lesson entries; the phone chord exercise shows all four paired shapes and Hear controls together. Tests supplement this visual review; they are not its substitute.

The four referenced supplied screenshots were unavailable, so their exact contents cannot be individually verified. Actual iPhone/iPad Safari speaker/Bluetooth audio, installed Home Screen updates, safe-area behavior and OS text sizing still require physical-device checks. Browser Web Audio starts do not establish audible output. No merge or deployment was performed.

Reproduce screenshots against the desired checkout with `JLK_BASE_URL=http://127.0.0.1:8000/ python3 tests/capture_weekly_ui.py after` (or `before`).
