# Changelog — Session Handoff and Live Context Compaction

Milestone-by-milestone record of the work described in
[`WORKPLAN-session-handoff.md`](./WORKPLAN-session-handoff.md) and planned in
[`PLAN-session-handoff.md`](./PLAN-session-handoff.md).

Each entry records what was added, what was proved, what was deliberately left
undone, and any place where the plan turned out to be wrong. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Evidence scale, as elsewhere in this project:

- **VERIFIED** — source, deterministic tests, and hardware evidence.
- **PARTIAL** — implementation and offline tests exist, hardware not verified.
- **UNVERIFIED** — no evidence beyond the source.

## Where this stands

All eight milestones are implemented and verified offline. Milestone 1 is fully
VERIFIED, including a documented recovery procedure that was executed rather than
described. Milestones 2–8 are PARTIAL: every failure path is proven against the
fake provider, and nothing has run against a live one.

The assembly is now attached to the live realtime path (Milestone 8), so the
smoke test is runnable for the first time. It has not been run. The three
Definition-of-Done items that need hardware — no audible gap, measured prepare
and overlap latency, and echo cancellation across a real cutover — are still
UNVERIFIED, and no amount of offline coverage will change that.

```text
memory-core                   59 tests
assistant-runtime            241 tests
speech-system/realtime core   50 tests
intelligence-core             94 tests
state-core                    16 tests   (no source changes)
aec-system                    42 tests   (no source changes)
```

---

## Milestone 9 — The conversation outlives the session — 2026-08-15 — PARTIAL

Repository: `assistant-runtime` alone. Found while scripting the hardware test,
which is the only reason it was found before a user hit it.

Wiring the handoff in exposed a defect nobody had written down: an episode was
keyed to the **provider session**, so a handoff closed it and ran memory
extraction over half a conversation. Extraction forms durable beliefs. A belief
formed at the halfway point is formed before the user has finished saying what
they meant — *"mám rád motorky"* becomes a stored fact, and *"malé, a loni jsem
ji prodal"* lands in a different episode.

### Changed

- **An episode is the conversation, not the session rendering it.**
  `EpisodeMemoryWriter` takes a `resolveConversationId`, and the runtime resolves
  every provider session to the logical session id. One conversation, one
  episode, one extraction, at the end.
- A replaced session is declared superseded at activation, before its
  `session.closed` can arrive. That close is the handoff working, not the
  conversation ending, and is traced as `memory.episode.kept_open`. Any output
  still in flight is completed as interrupted, because the session carrying it
  is gone.
- A close that is *not* a handoff still ends the conversation. The distinction is
  explicit rather than inferred from timing.

### Added

- **`conversation_recall`** (`src/delegation/episode-tools.ts`) — the turns of the
  conversation in progress, readable by the delegated text model. Scoped to the
  live logical session by the runtime; the model never names a session id, so
  there is no id space for it to probe. Diacritics are folded, because a Czech
  query typed without them must still match what was said. Turns are returned as
  tainted evidence, never as instruction, and carry their `unreliable`
  transcript marker so an uncertain transcript is not quoted back as verbatim.
- A line in the delegated model's brief telling it to reach for
  `conversation_recall` when the user refers to the current conversation.
  Without it the model searches semantic memory, finds nothing, and reports that
  nothing was said — false, and authoritative-sounding.
- `tests/handoff-episode-continuity.test.ts` — 5 cases.

### Why both halves had to ship together

Keying episodes to the conversation, on its own, is a regression. Until
extraction runs there are no memories of the current conversation, so the
delegated model would have had *nothing* to answer from — where previously the
premature extraction at the cutover accidentally gave it something. The lookup
had to replace the accident in the same change.

### Evidence

`assistant-runtime` — 246 tests, 0 failures; `npm run verify` clean; every file
also run in isolation with a hard timeout. Nothing has touched hardware. PARTIAL.

---

## Milestone 8 — Live wiring — 2026-08-15 — PARTIAL

Repository: `assistant-runtime` alone, branch `feat/handoff-wiring`. No other
core changed. `handoff.enabled` still defaults to `false`.

Milestone 7 shipped a complete, tested mechanism with no wire running into it:
`createHandoffComposition` existed and was never called, and the estimator had no
connection to the realtime event stream, so it would have read zero tokens
forever. This milestone is that wire.

### Added

- Multi-session support in `RealtimeCoreAdapter`: `openReplacement()`,
  `prefillSession()`, `activateSession()`, `closeSession()`, `activeSessionId()`.
  Every open session runs its own event pump from the moment it exists, so a
  replacement is not deaf to what the provider says about the context it was
  prefilled with.
- `RollingTranscript` (`src/handoff/transcript.ts`) — the conversation held by
  the runtime, bounded, reporting how many turns it dropped. Reseeded from the
  compacted summary via the new `HandoffCompositionOptions.onCompacted`, so a
  second handoff summarizes the first summary rather than losing it.
- `createRealtimeHandoffController` (`src/handoff/realtime-controller.ts`) — the
  whole translation between `HandoffSessionController` and the live adapter.
- `RealtimeSessionKind` (`"interaction" | "handoff"`) on the `onSession`
  subscription, so a consumer can tell a new conversation from a continued one.
- `tests/handoff-wiring.test.ts` — 8 cases against the real adapter and the real
  multi-session Realtime Core. Audio ownership is proven by sending frames and
  reading the provider's per-session counters, never by reading a variable the
  code under test also wrote.

### Changed

- **Delegation delivery is keyed to a logical session id, not to the physical
  session rendering it.** This is the change everything else waited on: after a
  commit `session.id` is a different string, and every delegation queued against
  the old one would be stranded at the moment its answer is due.
- `composition.ts` builds a handoff assembly per interaction, feeds the estimator
  from the realtime trace stream (transcripts *and* audio duration, both
  directions), drives the idle gate from user speech, and calls `maybePrepare()`
  after each recorded turn, starting `run()` without awaiting it.
- Echo rebinding points at the real `EchoGuard`. `activateSession` deliberately
  does not touch echo, so the handoff's rebinder remains the only thing that does.
- A session ending only tears down shared capture state if it was the session
  that owned audio. Previously any session's close cleared it — harmless with one
  session, and with two it would let a failing replacement silence the one still
  talking to the user.

### Where the plan was wrong

- **`HANDOFF.md` said the wiring was "one call plus the delivery rebinding".** It
  was not. `RealtimeCoreAdapter` was single-session throughout: one `active`
  field, one event pump, a greeting on every open. Realtime Core's multi-session
  API had been there since Milestone 6, but nothing in the runtime could reach
  it. The adapter work was the larger half of this milestone.
- **Extracting config-building into an async helper changed observable timing.**
  It deferred `core.connect` by one microtask, and capture arriving in that
  window found neither an open session nor one being opened.
  `tests/audio-routing.test.ts` caught it as a hang. `buildConfig` now returns
  synchronously when there is nothing to resolve. Worth recording because the
  refactor looked purely mechanical and was not.
- **Two existing tests stub `RealtimeCore` with only `connect`/`capabilities`/
  `health`.** Teardown now asks Realtime Core to forget the session and falls
  back to closing the session directly, which is the behaviour that actually
  matters: the transport must end either way.

### Left undone, deliberately

- `handoff.enabled` stays `false`. Turning it on is a hardware decision.
- The delivery-rebinding change is on the live path whether handoff is enabled or
  not, so the baseline hardware and delegated-voice smoke tests are owed before
  handoff is enabled at all. Recorded as prerequisite zero in the smoke test.

### Evidence

`assistant-runtime` — 241 tests, 0 failures; `npm run verify` (typecheck, tests,
build) clean. Every test file was additionally run in isolation with a hard
timeout, which is how the `audio-routing` hang above was found rather than
averaged away in a parallel run.

Nothing here has touched hardware. PARTIAL.

---

## Milestone 1 — Memory durability prerequisite — 2026-08-15 — VERIFIED

Repository: `memory-core` alone. Nothing here touches the realtime path.

Done last rather than first, on request. It gates *committing* to a lossy
compaction in production — what compaction drops must already be recoverable —
so it is a prerequisite for enabling handoff, not for building it.

### Added

- **`MemoryRuntime.restoreAll(records, onConflict)`** — restores many records as
  one transaction.
- **`ImportResult`** (`imported`, `skipped`, `schemaVersion`),
  `ImportConflictPolicy`, `ImportOptions`, and `parseExport`.
- **`inspectSqliteMigrations`** → `MigrationReport` (`currentVersion`,
  `targetVersion`, `pending`, `legacyRecordCount`, `wouldModify`,
  `missingTables`), using reads only.
- **CLI**: `import --input <file> [--on-conflict fail|replace|skip]`,
  `migrate --dry-run`, `migrate`.
- **`docs/backup-and-recovery.md`**.
- **`tests/integration/import-export.test.ts`** — 10 tests.

### Changed

- **`importMemories` now returns `ImportResult` rather than a bare count.**
  Breaking; the one existing caller was updated. A count cannot express what was
  skipped or which schema the restore landed on.
- **`InMemoryMemoryStore.transaction` rolls back by snapshot.** It was a mutex
  only — honest about concurrency, dishonest about atomicity. A multi-record
  operation that threw halfway left earlier writes in place, so a test against
  the in-memory store would pass while the same code lost data against SQLite.
  The nesting check moved above the mutex acquisition; below it, a nested call
  waits for a lock only it can release.

### Proved

- A round trip reproduces **whole records** — `memoryId`, `provenance`,
  `confidence`, `createdAt`/`updatedAt`, `status`, `supersedesId`, `tags`,
  `metadata` — compared field for field, not by content.
- A superseded chain survives with the link intact; a `forgotten` memory does not
  come back `active`.
- **A store carrying legacy v1 records round trips**, not merely a freshly
  created one.
- An import failing on its third record leaves the store byte-identical to before
  the call, and malformed input is refused before anything is written.
- `fail` / `skip` / `replace` each behave as named, with `skip` reporting what it
  passed over.
- `inspectSqliteMigrations` reports a v1 store and leaves `schema_migrations`
  untouched; inspecting twice gives the same answer.
- The CLI dry run does not migrate — asserted by running it twice and checking
  the version is still 1.
- An export is byte-stable across a second round trip, so a real change is
  distinguishable from a serialization artefact.

### Decisions

- **The conflict default is `fail`.** When an id already exists, refusing is
  correct; guessing which copy was meant is not.
- **`export` writes every status.** Dropping `forgotten` records on export would
  quietly resurrect things the user asked to be forgotten.
- **`migrate` is handled before the runtime is constructed.** Starting the
  runtime applies migrations, so a dry run routed through the normal path would
  report on a database it had already changed.
- **Plan correction:** the plan said "add import" and "add `transaction` to
  `MemoryStore`". Both already existed. The real gap was that `importMemories`
  looped over per-record transactions, so a partial failure was persistent.

### Documentation is executed, not asserted

Every command in `docs/backup-and-recovery.md` was run against a real store:
export to JSONL, import into a fresh database, `list` output identical between
source and restore, `migrate --dry-run` reporting without migrating, a second
import failing closed with exit code 1, and `--on-conflict skip` returning
`{"imported":0,"skipped":2,"schemaVersion":2}`.

### Verification

```text
memory-core   npm run verify   59 tests pass, typecheck + build clean
```

---

## Milestone 7 — Integration, AEC, and observability — 2026-08-15 — PARTIAL

Repository: `assistant-runtime`. `state-core` and `aec-system` needed no source
changes; their verify runs prove the integration did not regress them.

### Added

- **`src/handoff/state-publisher.ts`** — publishes
  `assistant.session.logical_id`, `.handoff_state`, `.handoff_reason` through the
  existing `StatePublisher`.
- **`src/handoff/metrics.ts`** — bounded counters and running aggregates for
  prepare latency, wait-for-idle, overlap, commits, and aborts by reason.
- **`src/handoff/echo-rebind.ts`** — rebinds the AEC reference on commit.
- **`src/handoff/composition.ts`** — the assembly: estimator, trigger, compaction,
  idle gate, coordinator, and observers wired together.
- **Four test files** — `handoff-observability`, `handoff-correlation`,
  `handoff-resilience`, `handoff-composition` — 20 tests.
- README and ARCHITECTURE sections in `assistant-runtime`.

### Proved

- Status goes `handoff_pending` → `handoff_active` → `idle`, and back to `idle`
  with the failure reason on an abort; the logical id never changes.
- **The echo reference is rebound to the replacement on commit, and never on
  prepare or on an abort.**
- Metrics report prepare latency, overlap and abort rate, with a snapshot shape
  that does not grow per attempt.
- A delegation submitted before the swap and completing after it is delivered to
  the replacement under the same logical id, and nothing is dropped.
- Provider disconnect in each phase and runtime shutdown in each phase leave one
  working session and nothing orphaned.
- The full assembly runs threshold → prepare → compaction → gap → commit, seeds
  the new window with what the replacement was actually prefilled with, and does
  nothing at all while `handoff.enabled` is false.

### Decisions

- **State Core got no code.** It is a generic keyed store; handoff status is
  ordinary data under a key prefix. Adding a handoff concept there would have put
  a policy in the layer that is supposed to be indifferent to policy.
- **Rebinding happens only on commit.** Rebinding on prepare would reset the
  filter while the *current* session is still speaking through it — trading a
  stale reference for no reference, on every attempt rather than only the ones
  that commit.
- **Compaction cost is not aggregated in the metrics.** It is already separated
  by role in the usage meter, and a second copy of a number is a second thing
  that can disagree with the first.
- **Plan deviation:** the echo rebinder is its own file rather than an edit to
  `echo-cancellation.ts`. It needs one method of `EchoGuard` and belongs with the
  handoff code, not inside the canceller.

### Not done — and this is the honest end of the offline work

**The assembly is not attached to the live realtime path.** `composition.ts`
binds delegation delivery to the *physical* session id, which is
indistinguishable from a logical id only while one session exists per
conversation. Introducing the logical id there changes a path that is verified on
hardware and cannot be verified from here, so it was left for a change that can
be tested where it runs.

Still **UNVERIFIED**, all needing hardware:

- a conversation continuing across a handoff with no audible gap;
- prepare latency and overlap duration measured against a live provider;
- echo cancellation across a real cutover — the rebinding is proven offline;
  that it is *sufficient* on real hardware is not.

**Milestone 1 has not been started.** Memory import, migration inspection and
documented recovery in `memory-core` gate committing to a lossy compaction in
production: what compaction drops must already be recoverable.

### Verification

```text
assistant-runtime             npm run verify   233 tests pass
speech-system/realtime core   npm run verify    50 tests pass
intelligence-core             npm run verify    94 tests pass
state-core                    npm run verify    16 tests pass
aec-system                    npm run verify    42 tests pass
```

---

## Milestone 6 — Realtime Core multi-session — 2026-08-15 — PARTIAL

Repositories: `speech-system/realtime core`, `assistant-runtime` (tests only).

### Added

- **`RealtimeSessionHandle`** in `src/contracts.ts` — `{ id, session, active }`.
- **`tests/multi-session.test.ts`** — 7 tests.

### Changed

- **`src/runtime.ts`** — `RealtimeCore` holds a session registry and records
  which session is active: `open`, `activate`, `active`, `sessions`, `close`.
  `connect` is retained as `open` plus `activate`, so every existing
  single-session caller is unchanged.
- **`assistant-runtime/tests/handoff-harness.ts`** now drives the real
  multi-session API instead of its own map, so the Milestone 2 audio-ownership
  tests assert against the code that will actually hold the sessions.

### Proved

- Two sessions open, exactly one active, across repeated activation.
- Audio reaches only the active session — asserted by per-session frame counts.
- Activating an unknown session raises a structured `RealtimeError`
  (`SESSION_CLOSED`), not a silent no-op.
- Closing the active session leaves **no** active session rather than promoting
  another.
- A mismatched provider is refused before any session is opened.
- **Realtime Core carries no handoff vocabulary** — a test greps every source
  file for `handoff` / `compaction` and fails if the boundary leaks.

### Decisions

- **`activate` is synchronous.** Same reason as the controller contract in M2:
  an `await` mid-swap is a window in which no session owns audio.
- **Closing the active session does not promote another.** A caller that lost
  the session it was speaking through must be told, not handed a different one
  that sounds the same.
- **`connect` was kept**, not replaced. Breaking every existing caller to express
  a capability they do not use would be a cost with no buyer.

### Verification

```text
speech-system/realtime core   npm run verify   50 tests pass, typecheck + build clean
assistant-runtime             npm run verify  213 tests pass, typecheck + build clean
```

---

## Milestone 5 — Idle-gap cutover — 2026-08-15 — PARTIAL

Repository: `assistant-runtime`.

### Added

- **`src/handoff/idle-gate.ts`** — `HandoffIdleGate`, `SessionIdleGate`
  (composes the scheduler's output state with the user's turn state), and
  `waitForIdle`.
- `HandoffCoordinator.commitWhenIdle()` — waits for a gap, re-checks it, commits.
- **`tests/handoff-idle-cutover.test.ts`** — 7 tests.

### Changed

- **`src/delegation/delivery.ts`** — `DelegationDeliveryScheduler` gains
  `isIdle(sessionId)` and `onIdle(sessionId, listener)`; `markOutputFinished`
  notifies after its existing drain. No second idle detector was introduced.

### Proved

- No cutover while the assistant is speaking; the commit lands on the first gap.
- No cutover while the **user** is speaking, even with the assistant silent.
- A session that never goes idle aborts on `NO_IDLE_GAP` rather than cutting
  mid-speech or waiting forever, and the working session is retained.
- **A user who starts speaking between the observed gap and the executed swap is
  not cut over** — driven by a gate that reports the gap once and then reports it
  closed, which is what the re-check exists for.
- An already-idle session commits without waiting.
- The gate and `when_idle` delivery answer the idle question identically,
  asserted side by side.
- The existing `when_idle` delivery tests still pass unchanged.

### Decisions

- **Idle detection was extracted, not duplicated.** A handoff cutover and a
  `when_idle` delivery are asking the same question; the workplan is explicit
  that forking that mechanism is the failure to avoid. The scheduler stays the
  single owner of "is the assistant speaking".
- **Idle means both directions are quiet.** The assistant being silent is not
  enough — cutting over mid-utterance loses the half of it the old session
  already received, and the replacement answers a fragment.
- **The gap is re-checked immediately before the swap.** `waitForIdle`
  resolving means a gap existed, not that one still does.
- **`commit()` stays as the immediate primitive**; `commitWhenIdle()` is the
  policy on top. Without an injected gate, `commitWhenIdle` degrades to an
  immediate commit rather than blocking.

### Verification

```text
assistant-runtime   npm run verify   213 tests pass, typecheck + build clean
```

---

## Milestone 4 — Compaction through the broker — 2026-08-15 — PARTIAL

Repositories: `assistant-runtime`, `intelligence-core`.

### Added

- **`assistant-runtime/src/handoff/compaction.ts`** — `DelegatedCompaction`
  (a `HandoffContextSource` backed by the existing Delegation Broker),
  `CompactedContext`, `readCompactedContext`, `renderCompactedContext`.
- **`tests/handoff-compaction.test.ts`** — 7 tests.

### Changed

- **`intelligence-core/src/observability/price-catalog.ts`** — `UsageRole`
  gains `"compaction"`. An additive union member at a shared contract boundary;
  no exhaustive switch on the type exists, and `intelligence-core` verifies
  green (94 tests).

### Proved

- **The live session keeps taking audio for the whole compaction** — five frames
  sent and counted while the execution is outstanding, not merely "compaction was
  started in the background".
- Compaction is submitted with `delivery: silent` and **no `sessionId`**, so
  `closeSession` cannot cancel it at the moment its result is needed.
- A compaction that fails, returns prose, or returns a valid-but-empty summary
  aborts the handoff; the working session is retained and the replacement is
  closed rather than left running and billing.
- The rendered prefill frames the summary as data, not instructions.
- `voice`, `delegation` and `compaction` aggregate as three distinct roles in the
  usage meter.

### Decisions

- **Compaction is not bound to the live session id.** It has to survive the
  session it is replacing. This is the opposite of the default for delegated
  work, and it is the whole reason `cancelOnSessionClose: false` is hardcoded
  here rather than configured.
- **An empty summary is a failure, not an empty success.** Prefilling with
  nothing yields a replacement that answers as though the conversation had just
  begun — silently, having reported success at every step.
- **`compaction` is metered apart from `delegation` despite sharing the broker.**
  It is spend the user never asked for; folding it into delegation would make an
  unattended cost look like requested work.
- The goal text tells the model the transcript is data to summarize and not
  instructions to follow, and a test asserts that sentence is present.

### Not done

The transcript source is an injected port; nothing yet feeds it from the live
conversation record. That wiring is Milestone 7.

### Verification

```text
assistant-runtime   npm run verify   206 tests pass, typecheck + build clean
intelligence-core   npm run verify    94 tests pass, typecheck + build clean
```

---

## Milestone 3 — Context estimation and trigger — 2026-08-15 — PARTIAL

Repository: `assistant-runtime`.

### Added

- **`src/handoff/context-estimator.ts`** — `RuntimeContextEstimator` and
  `ContextThresholdTrigger`. The estimate is measured by the runtime from what it
  sent and received; nothing waits on a provider signal.
- **`HandoffSettings` in `src/config.ts`** — `enabled`, `contextLimitTokens`,
  `prepareThreshold`, `readyTimeoutMs`, `idleWaitTimeoutMs`, with validation and
  defaults (`128000`, `0.70`, `20 s`, `30 s`). Off by default.
- `config.example.json` documents the block.
- **`tests/handoff-trigger.test.ts`** — 8 tests.

### Proved

- Crossing the threshold fires **exactly once**, not once per turn — over 200
  turns past the crossing point.
- A conversation that plateaus at half the window never triggers, and the trigger
  stays armed.
- The headroom left at the threshold exceeds a full `readyTimeoutMs` of speech by
  more than tenfold, asserted numerically — so lowering the threshold fails a
  test rather than quietly shrinking the safety window.
- `reset({ text })` seeds the new window with the compacted context and leaves
  it under a tenth of the old one. A handoff that does not buy headroom has not
  bought anything.
- A `prepareThreshold` of 0 or 1, or a non-positive limit, is refused at load
  rather than clamped.

### Decisions

- **Audio is counted.** A voice conversation's context is mostly audio, and an
  estimator that counted only transcripts would read a nearly-full session as
  nearly empty right until the provider terminated it. Default 32 tokens/second.
- **Two biases, both in the same direction.** The characters-per-token divisor
  (3) is below a real tokenizer's average, and the audio rate is above the ~25
  tokens/second providers document. Over-estimating costs an early handoff;
  under-estimating costs the conversation.
- **The trigger latches.** Without it every later turn re-crosses the threshold
  and the runtime spends the rest of the session opening replacements it never
  commits.
- **The context limit is configured, not discovered.** A wrong number is then
  visible in the trigger's behaviour instead of hidden in a provider response.

### Not done

The estimator is not yet wired into the live path — nothing calls `record` or
`recordAudio` from the realtime boundary yet, and nothing calls the coordinator
when `observe()` returns true. That wiring lands with Milestone 7's composition
work, once compaction (M4) and the idle gate (M5) exist for it to drive.

### Verification

```text
assistant-runtime   npm run verify   199 tests pass, typecheck + build clean
```

---

## Milestone 2 — Contract and fake provider — 2026-08-15 — PARTIAL

Repositories: `assistant-runtime`, `speech-system/realtime core`.

### Added

- **`assistant-runtime/src/handoff/contracts.ts`** — the provider-neutral
  handoff contract. `HandoffPhase` (`idle` → `prepare` → `ready` → `commit` →
  `teardown`, plus `aborted`), nine lifecycle events, `HandoffIdentity` carrying
  one stable `logicalSessionId` across two physical session ids,
  `HandoffFailureReason`, `HandoffError`, and the two ports the coordinator
  depends on: `HandoffSessionController` and `HandoffContextSource`.
- **`assistant-runtime/src/handoff/coordinator.ts`** — the state machine.
  One attempt at a time, exactly one terminal outcome, claimed synchronously
  before any side effect.
- **`assistant-runtime/tests/handoff-harness.ts`** — a session controller built
  on the fake realtime provider, plus `assertSoleAudioOwner`.
- **`assistant-runtime/tests/handoff-lifecycle.test.ts`** — 11 tests.
- **`assistant-runtime/tests/handoff-audio-ownership.test.ts`** — 5 tests.

### Changed

- **`speech-system/realtime core/src/fake.ts`** — the fake provider now retains
  every session it opened (`sessions()`), reports per-session audio frame counts
  (`audioFrameCounts()`), and can hold a context injection open until
  `markReady(sessionId)` releases it (`deferContextAck`).
- `assistant-runtime/src/index.ts` re-exports the handoff contract.

Realtime Core itself is untouched and still knows nothing about handoff. Holding
more than one session is Milestone 6.

### Proved

- `prepare → ready → commit → teardown` under one stable logical session id
  across two distinct physical sessions.
- `commit` is idempotent; a `commit` racing an `abort` publishes exactly one
  terminal event.
- A replacement that never acknowledges its context aborts on its deadline, and
  the working session is retained.
- `commit` before `ready` is refused without disturbing the attempt.
- Abort from `prepare` and from `ready`, a provider that refuses to open a
  replacement, a compaction that throws, and a transport that dies between
  `ready` and `commit` all retain the session that works.
- **Exactly one session receives audio after every transition on every path**,
  including the aborts — asserted by sending a frame and checking which
  session's count actually moved, not by reading a flag.

### Decisions

- **`activate()` is synchronous by contract.** An `await` between deactivating
  one session and activating the next is a window in which zero sessions own
  audio, which is the same defect as two owning it, only quieter.
- **A closed session rejects an outstanding prefill rather than resolving it.**
  Resolving would report readiness for a session that acknowledged nothing.
- **`commit()` after a terminal outcome is a silent no-op, not an error.** It is
  the same idempotency that makes a retry safe. The first version of the test
  asserted a throw; the code was right and the test was wrong.

### Not done

Context estimation and the trigger (M3), real compaction through the broker
(M4 — the coordinator calls an injected `HandoffContextSource` that returns a
fixed string), idle-gap cutover (M5), Realtime Core multi-session (M6), and
State Core publication, metrics and AEC rebinding (M7). Nothing has touched a
live provider.

### Verification

```text
assistant-runtime          npm run verify   191 tests pass, typecheck + build clean
speech-system/realtime core npm run verify   43 tests pass, typecheck + build clean
```
