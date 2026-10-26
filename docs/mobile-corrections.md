# Mobile navigation and Create reliability — 1.3.1

Base: merged v1.3 on main, `c822d353b21946f8c1dc044caa20addd5fcf7b7d`. Branch: `fix/mobile-navigation-create`.

## Changes

- JLK branding has its own centered header, larger serif letters and one small static SVG glint. The motto and decorative line are removed. Create Sheet Music and Settings are on a separate wrapping row; Settings opens the existing sound settings. All three primary modes remain separate.
- View Selected Chord has Previous Chord, Next Chord, a position counter and an independently scrollable strip for the complete sequence. It renders the existing progression and selection; no second musical state or audio engine is created. Tapping an entry updates the existing title, staff and piano without starting audio.
- Playback follows the playing chord until the user inspects another one. During manual inspection, selection stays put while a separate Playing label advances through the strip. Pause/Resume resumes from the established playback position and resumes following playback; Stop clears the playing indicator. Piano touch gestures are unchanged.
- Keyboard focus now has a restrained two-pixel outline. Pointer-triggered focus on task-header buttons does not add an outer ring around their existing border. Keyboard input restores visible focus. Other controls retain their focus styling.

## Create investigation and repair

The baseline current-main Create handler received taps, mounted the existing panel and opened the native dialog in Chromium at 320, 375, 390, 393 and 430 CSS pixels. No interception or initialization exception occurred with normal data. This does **not** establish what happened on the physical iPhone.

Two concrete failure paths were found and reproduced:

1. Serving the Stage A navigation module alongside the newer HTML/app leaves the Create button without its handler. This reproduces a tap with no visible response. Separately, missing composer modules and exceptions from composer setup previously had no targeted recovery feedback. These are demonstrated failure mechanisms, not a confirmed inspection of the phone's cached files.
2. The worker previously used `caches.match()` across every cache. A request could therefore be satisfied by an unrelated or different-version cache. It now reads only its own complete version cache. A browser fixture seeds an older wrong composer module before installation and verifies that it cannot supply the current editor.

Create initialization is now lazy, isolated and caught. The existing editor loads once when requested; a loading state is shown, editing controls stay hidden until ready, and failures remain prominently visible in the open dialog. The rest of the studio remains available. A small bootstrap also reports main-module startup failures and a Create tap that never opens its task, covering mismatched navigation without silently doing nothing. The message explains how to reopen online and does not delete or reset personal data. No forced worker activation, automatic reload, cache-reset control or new update workflow is introduced.

Composition model, composer entry/suggestions/save/print logic, audio engine, scheduler, theory and storage helpers are unchanged. The existing editor's print CSS is adjusted only for its new loading/content wrapper. Cache version is `jlk-studio-v1.3.1`, including both small new modules.

## Verification

All 39 Node tests and all eight Chromium browser suites passed:

```sh
npm test
python3 tests/browser_smoke.py
python3 tests/browser_v11.py
python3 tests/browser_progression.py
python3 tests/browser_design.py
python3 tests/browser_discover.py
python3 tests/browser_composer.py
python3 tests/browser_mobile_corrections.py
python3 tests/browser_mobile_update.py
```

The new mobile suite checks manual chord switching and exact staff/key pitches without audio starts; playback after browsing; separate selected/playing states; pause/resume/stop; a 12-chord strip; Create entry/save/playback; Back/Done/browser Forward; offline draft/library reopening; import/setup/startup failures; stale navigation; malformed draft retention; cache isolation; and touch/keyboard focus. Header checks cover all five requested widths, landscape and desktop, plus 150% and 200% root text sizing without page overflow. Actual safe-area insets remain a device check; the existing `viewport-fit=cover` and safe-area CSS are preserved.

The dedicated upgrade fixture installs the actual merged v1.3 shell, stores a composition, working draft, progression, preferences and session, then installs this version without forcing activation. After the old client closes, all stored strings remain byte-for-byte unchanged and the new lazy composer opens and plays offline under a repository subpath. Existing suites cover audio graph activity/recovery, progression transports, metronome/loop, practice, persistence, actual Chromium print PDF output and older-worker migration. The upgrade fixture needs baseline commit `c822d353` available in Git history.

### Review screenshots

- [Header, 393 × 852](screenshots/mobile-corrections/header-iphone.png)
- [Selected chord, 393 × 852](screenshots/mobile-corrections/selected-chord-iphone.png)
- [Create Sheet Music, 393 × 852](screenshots/mobile-corrections/create-iphone.png)

Physical iPhone Safari and Home Screen verification is still required: the original Create issue, notch/landscape safe areas, Safari larger-text settings, VoiceOver and keyboard focus, real speaker output/recovery, native print/AirPrint and installation updates. Chromium mobile emulation does not verify those device behaviors. No merge or deployment is performed by this work.
