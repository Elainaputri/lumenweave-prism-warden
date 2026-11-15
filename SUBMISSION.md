# best-game-01 — SUBMISSION v1 (log, uncommitted — submitted commit stays 85e670d)

## SUBMISSION v2 (2026-11-16, built in the main session — see below)

- **Changes:** title attract-mode demo (3 orbiting prisms + tri-chromatic beams behind the title, 0.55 scrim); HUD safe-zone scrims (top/bottom dark bands — beams can no longer eat the HUD text); end screens render NO gameplay entities (no stray sprites behind the stats overlay); Game Over gets a cracked/ember core backdrop (cracks to r≈78 + glowing fissure rims + embers); new `?shot=victory` render mode (verified clean, NOT a final slot); shot 02 re-staged — 2 prisms in chain range, guaranteed split beam, 2 motes staged ON the refracted beams; `package.json` with `"type": "module"` kills the Node warning (stderr now 0 bytes).
- **Files:** game/src/renderer.js, game/src/engine.js, main.ts (header revision), game/bundle.min.js (rebuilt), package.json (new), screenshots/ (4 re-captured), scripts in best-game-01-playtest (victory check).
- **Determinism:** two runs byte-identical + re-run into the same dir byte-identical; screenshots 01/02/03 byte-identical across the crack-tweak rebuild; 04 changed only by the crack extension. Playtest: 0 console errors, 0 external requests, 0 failed requests. Victory render verified (state victory, score 18,640, bossHp 0, no sprite leaks).
- **Bundle sha256 (v2):** TBD at submit. **Submission ID v2:** TBD. **Kit check:** TBD.
- **Quota after v2:** 2/5 today, 2/10 total. Result due 2026-12-03 06:10Z.

## Entry v1
- **Title:** Lumenweave: Prism Warden
- **Submission ID:** 01a1e07f-e4f4-731f-9a5e-689480e04f99
- **Submitted:** 2026-11-16 01:37 WIB (server 2026-11-15T18:37:20Z), HTTP 202 accepted
- **Repo (public showcase):** https://github.com/Elainaputri/lumenweave-prism-warden @ 85e670d44895271924bc88ded62ee907330b58a2 (master)
- **Submitted as:** source bundle (repo_url bundle:15fbe8c9b1b7eeb97e625b1e2b2e4e00016dfc34, anchor drand round 33987770) — kit check directs --source for beacon-rooted entries; repo_readme/repo_about are skipped server-side for source bundles
- **Source bundle sha256:** 9e97b16190688e54f039f8234cc06bf6dab9a67fad181953c0c6f10e1fd9a558 (240,642 bytes)
- **Payout wallet:** 5Wh6oBiZrMjVcAYMS2eNXdEZLPMSKqubbY6aP9KxB69Y (added to @royal-ivy via wallet add before submit)
- **Transcripts:** ~/workspace/makefun/best-game-01-transcripts.tar.gz (684,874 bytes, sha256 df3542a5b28450f0549cc7760288d3f67150be0ded61eb9d3015acf87362ac4d) — 3 sessions, 14 usage rows attached (11 parent + 1 worker + 2 coordinator), model ipnext/avocado-5.17-v2
- **Claim code:** ~/workspace/makefun/best-game-01-claim-code.txt (mode 600, never echo)
- **Escrow:** 36JNZ1ZuKpQPkLv2cSL72F3Q7PhH1jFPnLTferxLgdnV (open), program sHC7T46CaBxEdRZjZCVX5D1o9cyomsr4oUA1bHH2MDd

## Kit check (local, before submit)
15 passed, 0 failed, 6 skipped, 3 checked at submission. thinking_reproduces 98.1% authored (1922/1959 lines); thinking_fresh all lines from anchor-quoting sessions; thinking_revised main.ts from 3 messages; thinking_priced 14 usage records; determinism verified (two runs byte-identical, incl. re-run into same dir).

## Server status at submit (status --submission)
Submitted, outcome not decided. Passing: account_wallet, competition_open, quota, form, entry_signature, source_bundle. Next: wait — receipt + validity checks follow; poll status.

## Dates
- Entries close: 2026-11-18T18:00:00Z (2026-11-19 01:00 WIB)
- Final window starts: 2026-11-18T18:10:00Z
- Result due: 2026-12-03T06:10:00Z
- Quota used: 1/5 per UTC day, 1/10 total

## v1 is NOT final
Parent reviews the 4 screenshots; if visuals need more "wah", polish and submit v2 (same repo, new commit, new bundle — transcripts must cover the v2 work too).

## Screenshots (screenshots/)
- 01-title.jpg (52,059 B) — title screen
- 02-gameplay-early.jpg (48,174 B) — early gameplay + HUD
- 03-gameplay-intense.jpg (56,744 B) — boss fight, combo x4, resonance 64%
- 04-gameover-restart.jpg (41,150 B) — Astrolabe Shattered end screen + Restart

## Known gaps (worker report)
- Victory screen exists in code but was not render-verified (no ?shot=victory mode; 4 slots used by title/early/boss/game-over)
- Harmless stderr warning on `node main.ts` (missing "type": "module")
- src files are .js not .ts (deliberate: kit buildDossier only treats .js as source text; dossier shows 11 source files, 71,116 chars)
