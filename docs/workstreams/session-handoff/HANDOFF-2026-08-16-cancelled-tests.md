# Handoff — 22 handoff tests cancelled on CI, green locally

**Date:** 2026-08-16
**Branch:** `docs/decision-records` (all 13 repositories)
**Blocking:** [Assistant-mark-II#12](https://github.com/Brightwav3/Assistant-mark-II/pull/12) `integration`
**Not blocking:** documentation work — that is green everywhere

---

## One-paragraph summary

Twenty-two tests in the session-handoff suite are **cancelled**, not failed, on the
CI runner. They pass locally, every time, including the full suite. The set is
byte-identical across three runs, so this is deterministic, not flake. Every one of
the twenty-two exercises an **abort, timeout, or failure path**; not a single
happy-path test is affected. Raising the wall-clock budgets — the obvious first
guess — changed nothing at all. The most likely remaining difference between the
two environments is the Node major version: CI pins 22, this machine runs 24.

---

## Symptom

```
# tests 267
# pass  244
# fail  0        ← no assertion fails
# cancelled 22
```

Each cancelled test reports:

```
failureType: 'cancelledByParent'
error: 'Promise resolution is still pending but the event loop has already resolved'
```

The job exits 1 because cancelled is not passed.

## Distribution — this is the useful part

| File | cancelled / total |
| --- | --- |
| `handoff-observability.test.ts` | **5 / 6** |
| `handoff-lifecycle.test.ts` | **8 / 11** |
| `handoff-idle-cutover.test.ts` | **5 / 7** |
| `handoff-audio-ownership.test.ts` | **3 / 5** |
| `handoff-resilience.test.ts` | 1 / 7 |
| `handoff-compaction.test.ts` | 0 / 7 |
| `handoff-composition.test.ts` | 0 / 4 |
| `handoff-correlation.test.ts` | 0 / 3 |
| `handoff-episode-continuity.test.ts` | 0 / 6 |
| `handoff-trigger.test.ts` | 0 / 8 |
| `handoff-wiring.test.ts` | 0 / 8 |

**Partial within files.** That rules out a file-level load or registration problem —
if the file hung, all of its tests would go.

### What the twenty-two have in common

Read the names. Every one is an abort, a deadline, or an injected failure:

- a replacement that never becomes ready cannot be committed
- a session that never goes idle aborts on its deadline instead of cutting over or hanging
- waitForIdle reports the deadline rather than resolving optimistically
- one session owns audio through an aborted handoff
- one session owns audio when a commit fails at the transport
- a provider that refuses to open a replacement aborts rather than failing silently
- a compaction that fails aborts the handoff and retains the session
- a transport that dies between ready and commit reports failure without swapping ownership
- an abort returns state to idle and records the failure reason
- an aborted handoff never rebinds the echo reference
- a second prepare cannot start while one is in flight
- commit before ready is refused and leaves the attempt in prepare

**No happy-path test is cancelled anywhere in the suite.**

The working hypothesis follows directly: when `HandoffCoordinator` takes an abort
or timeout path, something it awaits is left unsettled. On Node 24 the runner
still drains it; on Node 22 the loop resolves first and the runner cancels the
subtree.

## What has been ruled out

### Not the documentation change

The branch adds comments and Markdown. A comment cannot cancel a test. The three
runs before and after the documentation commits show the same twenty-two.

### Not timezone

A separate, genuine failure — `runtime-trace.test.ts` asserted a hard-coded
`153012` stamp against a `13:30:12Z` input, correct only at UTC+2. Fixed in
`6a230de`, verified under UTC, Europe/Prague, America/Los_Angeles and Asia/Tokyo.
That moved `fail 1 → 0`. It is unrelated to the cancellations.

### Not the wall-clock budgets — this was tried and it did nothing

`ff1b8e1` raised `readyTimeoutMs` 1s → 10s and `idleWaitTimeoutMs` 100ms → 1s in
the affected fixtures, on the theory that parallel test files on a loaded runner
were expiring the deadlines from scheduling latency.

**Result: identical. Same 22 tests, same count, same error.**

That negative result is worth more than the change was. A contention problem would
vary between runs and would shift when the budget moved by 10×. This did neither.
It is structural.

Note `handoff-observability.test.ts` keeps `readyTimeoutMs: 50` deliberately — it
exists to watch a deadline fire — and it is the *worst* affected at 5 of 6. Which
fits: the tests that make a deadline fire are the tests that break.

### Not flake

Three runs, identical set:

| Run | fail | cancelled |
| --- | --- | --- |
| 31909331776 | 1 (trace) | 22 |
| 31909873397 | 0 | 22 |
| 31911182679 | 0 | 22 |

## The leading hypothesis

**Node 22 versus Node 24.**

```
local              v24.14.1        267/267, 0 cancelled
CI (both workflows) node-version: 22   244 pass, 22 cancelled
package.json       engines: node >=22
```

Nothing else differs that plausibly changes whether a pending promise is drained
or cancelled at process teardown. `node --test` changed its handling of unsettled
subtest promises between those majors.

If that is right, the code has a real defect — an abort path that leaves a promise
unsettled — which Node 24 happens to tolerate and Node 22 does not. **The bug is in
the coordinator, not in the runner.** CI is telling the truth.

## Next steps, in order

1. **Reproduce on Node 22 locally.** This is the whole ballgame — everything else
   is guessing until it reproduces.
   ```bash
   nvm install 22 && nvm use 22
   cd assistant-runtime && npm ci && npm test
   ```
   Expected: the same 22 cancelled. If so, the loop is closed and it is debuggable
   at a breakpoint.

2. **If it does not reproduce on Node 22**, run the suite on CI with
   `--test-concurrency=1` to eliminate cross-file interference. This was the agreed
   fallback ("B") and is one extra run.

3. **Find the unsettled promise.** Start in `src/handoff/coordinator.ts` on the
   abort path, then `src/handoff/idle-gate.ts` (`waitForIdle`) — five of the
   idle-cutover tests are cancelled and its own deadline test is among them. Look
   for a promise created for a deadline that is never resolved or rejected when the
   attempt aborts for a different reason first.

4. **Decide the Node floor.** `engines` says `>=22` and CI pins 22 while development
   happens on 24. Either test both, or move both to one. Right now the difference
   is discovered by CI rather than declared.

## What is safe to merge regardless

The documentation work is independent and green:

- `documentation-structure` passes in 24–31s on Ubuntu, every run
- `portability-typecheck` passes on ubuntu-latest and macos-latest
- 11 of 12 submodule PRs are green
- No source behaviour changed anywhere — comments and Markdown only, plus the two
  test commits described above

## Related, separate problem

[assistant-runtime#7](https://github.com/Brightwav3/assistant-runtime/pull/7)
`verify` fails for an unrelated reason: its workflow checks siblings out from their
**default branch**, and features it already depends on live in commits that were
never pushed to those siblings' `main` (`EpisodeUncertainPart`,
`RealtimeCore.open/activate/close`). Merging memory-core#2 and
Jarvis-speech-system#6 fixes it. Detail is in a comment on that PR.

Worth its own issue: pinning nine sibling repositories to `main` with no ref means
a green run proves the combination worked at that moment, not that the commit is
sound.

## Commits on this branch relevant to the above

| | |
| --- | --- |
| `6a230de` | fix(test): derive the trace stamp instead of hard-coding one timezone |
| `ff1b8e1` | test(handoff): give the wall-clock budgets room for a loaded runner — **no effect, consider reverting** |

`ff1b8e1` is harmless but it now documents a hypothesis that was disproved. Either
revert it or keep it for the 20s figure `handoff-trigger` already treats as
realistic — but do not leave anyone thinking it fixed something.
