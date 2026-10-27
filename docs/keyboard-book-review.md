# Keyboard Progression Book — integration review

Branch `feat/keyboard-progression-book`, based on main `041b6d3c10e3c0aa644b3079cfce31654fe60e19` (merged mobile corrections). The collection is complete against the user-uploaded October 13 reference. Jared supplied ChatGPT's review approving the content organization subject to the checks below; those checks are incorporated. This is not a claim that ChatGPT ran or independently tested this implementation.

## Source reconciliation

| Snapshot | Bytes | SHA-256 |
| --- | ---: | --- |
| October 5 Library reference | 48,613 | `69448b6ab35ca49567dadc66e8a331bc9fdba73c9ecc31afec6199ece4a04730` |
| October 13 user upload | 49,267 | `5a9b8886566c602057635ce352f4b2d1d4bd0f90309c0d2d783c154917b440c8` |

Both exact sources are archived as inert `.html.txt` files in `docs/sources/`; parsed snapshots and their provenance are in `data/`. The runtime uses October 13. The October 5 text was reassembled from seven numbered chunks without separators, matching all chunk lengths and the reported full byte count. The earlier truncated forwarding was rejected rather than reconstructed. October 13 was downloaded directly from the actual Sediment upload and independently parsed.

All 43 earlier chord/technique records are unchanged, including **I Dreamed a Dream** immediately before the addition. October 13 adds **Viva La Vida**, three loop variants and 12 rows; the cover changes from 10 to 11 songs. Constants and all other extracted front/back matter are unchanged. The outer export wrapper also changes colors; its layout is not used by the app.

| Section | Content pages | Blocks | Chord rows |
| --- | ---: | ---: | ---: |
| Easy Chords | 3 | 11 | 36 |
| Techniques | 6 | — | — |
| More Progressions | 4 | 12 | 48 |
| Mood Loops | 20 | 60 | 240 |
| Song Vibes | 11 | 33 | 132 |
| **Total** | **44** | **116** | **456** |

There are 38 chord pages, six technique lessons and four front/back pages: **48 reader screens**. Original printed labels run through **49** because Contents is an overlay instead of reader page 3. Viva La Vida is p.48 and Keep Playing p.49. Old source comments saying “48-page book” are stale; numbering is derived from actual source order.

## User experience and content integrity

Open **Progressions → Keyboard Progression Book**. Section filtering and title/mood/patch search keep all results in source order. Browse & Play links directly to Easy Chords, More Progressions, Mood Loops and Song Vibes in this same reader; Guided Studies links to its six technique references. These are cross-links, not duplicated content or new primary modes. Continue restores the last selected page; Contents, internal page references, Previous/Next and horizontal content swipes provide navigation. Native Back/Done and browser history retain the existing task behavior. Pages scroll normally, text wraps, zoom remains enabled, and edge/pinch/vertical gestures are not blocked. The source's fixed layout, forced shrink-to-fit and disabled zoom are not copied.

Every title, instruction, mood, patch name, loop label, footer, technique bullet/step and ordered hand tuple is preserved. Tuple order is `[chord, RH notes, LH bass]`; tables deliberately display Chord / LH / RH with correct labels. Repeated rows and loops remain. Relative octave markings such as `Eb+Eb'` and bass choices that differ from chord roots are retained. Page-reference placeholders resolve to the derived original book page numbers without changing the source snapshot.

This is a faithful playable-at-your-own-keyboard **reference collection**. It does not create an authoritative audio arrangement from unspecified octaves, timing, fingering or tempo. There are no deceptive Play buttons. Roland patch names are reference suggestions and do not claim that the app synthesizer supplies those patches. Existing progression/audio/study/practice/composition functionality remains available unchanged.

All song pages retain simplified-sketch framing. The interface identifies practice variants and does not certify song sections, original recording keys or note-for-note accuracy. In particular, Viva La Vida B/C remain the source's practice variants. Its “whole song” wording remains a source assertion, not an independent verification by this app.

## Transparent educational corrections

- **Circle of Fifths:** preserve the written C–G–D–A… sequence; clarify that this moves by ascending fifths and the original footer reverses the directions.
- **Sordid Affair:** preserve all spellings/notes; clarify that B-flat minor is enharmonic A-sharp minor (iii in F-sharp major), while A-flat/G-sharp **major** is non-diatonic.

Each correction is shown separately, with the verbatim original footer available in an expandable source note. Printing includes both the correction and original footer. Raw datasets are never silently corrected.

Technique pages explicitly label the Cmaj7 try-it patterns as alternative voicings to Late-Night Melt; both original note orders remain. The pedaling conflict is resolved with a visible clarification: for legato/syncopated pedaling, repedal promptly after clearing the old harmony, typically a fraction of a second later. A full-beat delay produces a different effect. Both original source passages are preserved below that note; no instruction is silently overwritten. No major decision remains for this reference integration.

## Architecture and data safeguards

The reference uses the existing task navigation and a small lazy-loaded renderer. It copies only permitted text/formatting from inert front-matter templates; source scripts/styles/attributes are never mounted. No new framework, runtime dependency, account, backend or paid service is introduced.

The source importer parses literal data without running source JavaScript. It rejects truncation markers, missing collections, malformed hand rows and expressions. It records source label, SHA-256 and byte length. Source/version reconciliation tests protect existing records against accidental replacement; snapshots remain separate so future additions can be compared.

The only new personal-storage key is `keyboard-book-position-v1`, through the existing storage helper. Progression saves, working sequences, composition saves/drafts and preferences retain their keys and schemas. No composition or progression is replaced by reading the book. `audio.js`, `playback.js`, `composer.js`, both composition model/storage modules, theory and the existing storage helper are unchanged.

The `jlk-studio-v1.4` worker caches the complete latest reference and reader modules locally. Fetches remain scoped to that version's cache. Historical source archives and the older snapshot are review artifacts, not required offline runtime downloads. Existing waiting-worker activation behavior is retained; no forced activation or automatic reload is added.

## Validation

45 Node tests and seven Python audit tests pass. The nine Chromium browser suites below cover the complete final reference; the upgrade suite also runs against both v1.3 and current main.

```sh
npm test
python3 -m unittest discover -s tests -p 'test_keyboard_book_import.py' -v
python3 tests/browser_smoke.py
python3 tests/browser_v11.py
python3 tests/browser_progression.py
python3 tests/browser_design.py
python3 tests/browser_discover.py
python3 tests/browser_composer.py
python3 tests/browser_mobile_corrections.py
python3 tests/browser_mobile_update.py
python3 tests/browser_book.py
```

`JLK_BASE_URL` selects a repository-subpath server. Existing upgrade fixtures now copy the new `data/` asset folder, so their hosted app includes the complete cache manifest. Their waits also poll the live waiting-worker state synchronously and then track that exact worker through activation. A focused check showed this Playwright build resolves an async `wait_for_function` expression even when it resolves false; that could advance the fixture before activation and falsely report stale HTML. The corrected fixture waits for real activation and cache cleanup without changing application update behavior. In addition to the original v1.3 upgrade fixture, upgrade from the latest merged mobile release with:

```sh
JLK_UPGRADE_BASE=041b6d3 JLK_UPGRADE_OLD_CACHE=jlk-studio-v1.3.1 \
JLK_UPGRADE_OLD_CREATE='Create Sheet Music' JLK_UPGRADE_BOOK=1 \
python3 tests/browser_mobile_update.py
```

The book browser suite compares every rendered chord/RH/LH row and technique bullet/step to the latest source snapshot, checks all front/back pages, filtering, corrections, reference links, navigation, reading-place retention, source download failures, offline use and clean print output. It checks 320/375/390/393/430px, landscape and desktop layouts plus 200% text. Actual Chromium print PDF content includes source notes/corrections and excludes controls. Existing suites cover theory/audio states, graph activity, progression transports/metronome/loop, practice, Create entry/suggestions/saves/printing and old-worker migration. The current-main upgrade fixture checks byte-for-byte retention of compositions, working draft, progression, session and preferences, then offline book/compose access.

Screenshots: [Contents](screenshots/keyboard-book/contents-iphone.png), [Mood page](screenshots/keyboard-book/mood-page-iphone.png), [song reference](screenshots/keyboard-book/song-page-iphone.png), [Viva La Vida](screenshots/keyboard-book/viva-la-vida-iphone.png), [technique clarification](screenshots/keyboard-book/technique-iphone.png).

Physical iPhone Safari/Home Screen, VoiceOver, real notch/safe-area behavior, gesture behavior, actual speaker output/recovery, native print/AirPrint and installation updates remain manual release checks. Chromium emulation is not physical-device verification. No merge or deployment is performed by this work.

A closer-to-recording arrangement collection for all 11 songs is a separate follow-on. It is not implemented or claimed here. The book remains a pitch-name/hand reference; no external-song transcription, recording playback or new audio arrangement is introduced.
