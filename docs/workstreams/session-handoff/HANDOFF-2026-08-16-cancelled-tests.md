# Handoff — 22 handoff tests cancelled on CI, green locally

**Date:** 2026-08-16
**Branch:** `docs/decision-records` (all 13 repositories)
**Status: RESOLVED.** Fixed in `87bbf80`. Kept as the record of how it was found,
because two plausible explanations were wrong and the negative results are what
pointed at the real one.

---

## Resolution

**Both handoff deadlines were `unref`'d.**

```ts
timer = setTimeout(() => reject(new Error("HANDOFF_READY_TIMEOUT")), ms);
timer.unref?.();                                    // coordinator.ts
```
```ts
const timer = setTimeout(() => finish(false), timeoutMs);
timer.unref?.();                                    // idle-gate.ts
```

An unref'd timer must not keep the event loop alive. So when the runtime is
waiting on **nothing but the deadline** the loop drains, the timer never fires,
and the promise it would settle stays pending forever.

That is exactly the case each deadline exists for — a replacement that never
becomes ready, a session that never goes idle. **A stalled handoff hung instead of
aborting**, which is the opposite of what a timeout is for. In a live session it
would be an assistant that stops mid-handoff and never recovers.

Removing `unref` is safe: `withTimeout` clears in `finally` on every path and
`waitForIdle` clears in `finish` on both, so neither timer can outlive the attempt
it bounds.

| | Node 22.23.2 | Node 24.14.1 |
| --- | --- | --- |
| before | 244 pass / **22 cancelled** | 267 / 0 |
| after | **267 / 0** | **267 / 0** |

**Why only CI saw it.** Node 24 keeps the loop alive long enough that the timer
still fires; Node 22 does not. CI pins 22, development runs 24, `engines` says
`>=22`. The defect was real on a supported version the whole time — nobody had
ever run the suite on 22.

**Why both earlier hypotheses failed, in hindsight.** Raising the budget could not
help because the timer never fired at all: fifty milliseconds and ten seconds are
the same when nothing is waiting. Serial execution could not help because it was
never contention. Both negative results were correctly pointing at something
structural.

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

### Not concurrency either — also tried, also did nothing

The agreed fallback ran the suite serially with `--test-concurrency=1`. The flag is
confirmed present in the CI log, and the composed-runtime step went from about 17s
to 35s, so it genuinely ran one file at a time.

**Result: identical. Same 22 tests, same count, same error.**

Cross-file interference is eliminated. Both timing hypotheses are now dead, and
both changes are reverted in `4d583cb` — a change that fixes nothing but looks like
a fix is worse than no change, because the next reader takes a ten-second budget
and a serial runner for decisions somebody made on purpose.

### Not flake

Four runs, identical set:

| Run | fail | cancelled | what changed |
| --- | --- | --- | --- |
| 31909331776 | 1 (trace) | 22 | baseline |
| 31909873397 | 0 | 22 | after the timezone fix |
| 31911182679 | 0 | 22 | budgets raised 10× |
| 31911595957 | 0 | 22 | serial, `--test-concurrency=1` |

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

## How it was found — the step that mattered

Reproducing locally on the CI's Node version. Everything before that was
inference; this closed the loop in one run:

```bash
winget install Schniz.fnm
fnm install 22
<node22> --import tsx --test tests/handoff-lifecycle.test.ts
```

Result: 3 pass, 8 cancelled — matching CI's 8-of-11 for that file exactly. From
there it was a breakpoint's worth of work: tests 1–3 passed and 4 hung, so
everything after it was cancelled by the parent. Test 4 is
*"a replacement that never becomes ready cannot be committed"* — a test whose whole
job is to wait for the deadline.

**Lesson worth keeping: test on the Node version CI pins.** The gap between
`engines: >=22`, a runner on 22, and a developer on 24 hid a real defect for the
life of the feature.

## What was tried before, for the record

1. ~~Reproduce on Node 22 locally.~~ **Done — this is what solved it.**

2. ~~**Find the unsettled promise.**~~ Start in `src/handoff/coordinator.ts` on the
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

## Related, separate problem — resolved, but the design issue stands

[assistant-runtime#7](https://github.com/Brightwav3/assistant-runtime/pull/7)
`verify` failed for an unrelated reason: its workflow checks siblings out from their
**default branch**, and features it already depends on lived in commits that were
never pushed to those siblings' `main` (`EpisodeUncertainPart`,
`RealtimeCore.open/activate/close`). Merging memory-core#2 and
Jarvis-speech-system#6 fixes it. Detail is in a comment on that PR.

Worth its own issue: pinning nine sibling repositories to `main` with no ref means
a green run proves the combination worked at that moment, not that the commit is
sound.

## Commits on this branch relevant to the above

| Commit | | |
| --- | --- | --- |
| `6a230de` | derive the trace stamp instead of hard-coding one timezone | genuine fix, kept |
| `ff1b8e1` | raise the wall-clock budgets 10× | no effect, reverted |
| `6299b7d` | run the suite serially as a probe | no effect, reverted |
| `4d583cb` | revert the two disproved timing hypotheses | — |
| `87bbf80` | **stop unref'ing the deadlines that bound a stuck handoff** | **the fix** |

Two behavioural changes to this repository survive: the timezone fix and the
deadline fix. Everything else on the branch is comments and Markdown.
