# Implementation Plan — Session Handoff and Live Context Compaction

Companion to `WORKPLAN-session-handoff.md`. The workplan defines the
destination; this names the exact files, contracts, and tests that get there.

Every milestone below states its repository, the files added or changed, the
contract it introduces, and the test that proves it. A milestone is done when
its repository's own `npm run verify` passes with those tests present.

---

## Findings that change the workplan

Recorded first because two of them make the work smaller than the workplan
assumed, and one makes it larger.

**Memory import already exists.** `memory-core/src/import-export/import-export.ts`
exports `importMemories`, and `MemoryRuntime.restore` is the write path it uses.
Milestone 1 is therefore not "add import" but "make the existing import atomic,
reachable, and proven". The workplan's claim that memory-core "can export but
cannot import" is out of date.

**State Core needs no code change.** `state-core` is a generic keyed store with
TTL, ownership, and subscriptions (`StateRuntime.set` / `subscribe`). Handoff
status is published as ordinary records under a key prefix. Milestone 7 changes
`assistant-runtime` only.

**Realtime Core is single-session by construction.** `RealtimeCore` holds one
provider and `connect()` returns a session with no registry behind it
(`speech-system/realtime core/src/runtime.ts`). Milestone 6 is a real structural
change, not a wrapper.

---

## Milestone 1 — Memory durability prerequisite

Repository: `memory-core` only. No realtime path touched.

### Files

| File | Change |
| --- | --- |
| `src/import-export/import-export.ts` | Make `importMemories` all-or-nothing; add `ImportResult`, `ImportOptions`. |
| `src/store/memory-store.ts` | Add `transaction<T>(fn): Promise<T>` to the `MemoryStore` contract. |
| `src/store/sqlite/sqlite-memory-store.ts` | Implement `transaction` over `BEGIN` / `COMMIT` / `ROLLBACK`. |
| `src/store/in-memory-store.ts` | Implement `transaction` by snapshot-and-restore. |
| `src/store/sqlite/schema.ts` | Add `inspectSqliteMigrations(db): MigrationReport` — reports without writing. |
| `cli/main.ts` | Add `import`, `migrate --dry-run`, `migrate` commands. |
| `docs/backup-and-recovery.md` | New. What to copy, how to verify, how to restore. |
| `README.md`, `ARCHITECTURE.md`, `PROGRESS.md` | Reflect the above. |

### Contracts

```ts
export interface ImportOptions { onConflict?: "fail" | "replace" }
export interface ImportResult { imported: number; skipped: number; schemaVersion: number }
export interface MigrationReport {
  currentVersion: number;
  targetVersion: number;
  pending: number[];
  legacyRecordCount: number;
  wouldModify: boolean;
}
```

`importMemories` returns `ImportResult` rather than a bare count, and throws
`MemoryError("MEMORY_INVALID", …)` before writing anything when any record fails
validation.

### Tests

`tests/unit/import-export.test.ts` (new)

- Round trip reproduces `memoryId`, `provenance`, `confidence`, `status`,
  `createdAt`, `updatedAt`, `supersedesId`, `tags`, `metadata` — field-by-field
  equality, not content equality.
- Round trip preserves a superseded chain: a record and its superseder both
  survive with the link intact.
- A file whose third record is invalid leaves the store byte-identical to before
  the call (compare a full `list()` snapshot).
- `onConflict: "fail"` on an existing id aborts the whole import.

`tests/integration/migration-inspect.test.ts` (new)

- `inspectSqliteMigrations` on a v1 store reports `currentVersion: 1`,
  `wouldModify: true`, and leaves `schema_migrations` unchanged.
- Export from a migrated-from-v1 store, import into a fresh store, round trip
  holds. This is the workplan's "legacy v1 records" requirement.

`tests/unit/cli.test.ts` (extend)

- `import` and `migrate --dry-run` emit structured JSON and non-zero exit on
  failure.

### Done when

`npm run verify` passes in `memory-core`, and `docs/backup-and-recovery.md`
describes a restore that was actually performed against a v1 store.

---

## Milestone 2 — Contract and fake provider

Repositories: `assistant-runtime` (contracts), `speech-system/realtime core`
(fake).

### Files

| File | Change |
| --- | --- |
| `assistant-runtime/src/handoff/contracts.ts` | New. Phases, events, identity. |
| `assistant-runtime/src/handoff/coordinator.ts` | New. The state machine. |
| `assistant-runtime/src/contracts.ts` | Re-export handoff events into the runtime event union. |
| `speech-system/realtime core/src/fake.ts` | Multi-session support and readiness reporting. |

### Contracts

```ts
export type HandoffPhase = "idle" | "prepare" | "ready" | "commit" | "teardown" | "aborted";

export interface HandoffIdentity {
  /** Stable across the handoff. Everything downstream keys on this. */
  logicalSessionId: string;
  /** The session currently owning audio. */
  activePhysicalSessionId: string;
  /** Present from `prepare` until `teardown`. */
  replacementPhysicalSessionId?: string;
}

export type HandoffReason = "context_threshold" | "manual";
export type HandoffFailureReason =
  | "COMPACTION_FAILED"
  | "REPLACEMENT_NOT_READY"
  | "NO_IDLE_GAP"
  | "PROVIDER_DISCONNECTED"
  | "RUNTIME_SHUTDOWN";

export type HandoffEvent =
  | { type: "handoff.prepared";  identity: HandoffIdentity; reason: HandoffReason; occurredAt: string }
  | { type: "handoff.ready";     identity: HandoffIdentity; reason: HandoffReason; occurredAt: string }
  | { type: "handoff.committed"; identity: HandoffIdentity; reason: HandoffReason; overlapMs: number; occurredAt: string }
  | { type: "handoff.aborted";   identity: HandoffIdentity; reason: HandoffReason; failure: HandoffFailureReason; occurredAt: string }
  | { type: "handoff.failed";    identity: HandoffIdentity; reason: HandoffReason; failure: HandoffFailureReason; occurredAt: string }
  | { type: "compaction.started";   identity: HandoffIdentity; executionId: string; occurredAt: string }
  | { type: "compaction.completed"; identity: HandoffIdentity; executionId: string; tokens: number; occurredAt: string }
  | { type: "compaction.failed";    identity: HandoffIdentity; executionId: string; failure: HandoffFailureReason; occurredAt: string };
```

The coordinator exposes exactly four operations — `prepare()`, `ready()`,
`commit()`, `abort(failure)` — and one accessor `phase()`. `commit()` is
idempotent by the same mechanism the broker already uses for terminal
delegation events: a `#terminal` guard checked before any side effect.

Realtime Core learns nothing about handoff. The fake gains:

```ts
// speech-system/realtime core/src/fake.ts
sessions(): FakeRealtimeSession[];   // every session opened, in order
markReady(sessionId: string): void;  // test-driven readiness
```

Readiness on the real provider is inferred from a `setupComplete`-equivalent
event plus an acknowledged context injection; the fake models both.

### Tests

`assistant-runtime/tests/handoff-lifecycle.test.ts` (new)

- `prepare → ready → commit → teardown` emits the five events in order with a
  stable `logicalSessionId` and two distinct physical ids.
- `commit()` called twice produces one `handoff.committed`.
- `commit()` racing `abort()` produces exactly one terminal event.
- A replacement that never reaches `ready` cannot be committed — `commit()`
  throws `HANDOFF_NOT_READY` and the phase stays `prepare`.
- Abort from each of `prepare` and `ready` retains the original session.

`assistant-runtime/tests/handoff-audio-ownership.test.ts` (new)

- A helper asserts, after every transition in every path above, that exactly one
  session has received audio frames and exactly one is registered for playback.
  This is the invariant test the workplan calls for; it runs across all paths,
  including aborts.

---

## Milestone 3 — Context estimation and trigger

Repository: `assistant-runtime`.

### Files

| File | Change |
| --- | --- |
| `src/handoff/context-estimator.ts` | New. |
| `src/config.ts` | Add the `handoff` config block. |
| `config.example.json`, `.env.example` | Document the defaults. |

### Contracts

```ts
export interface ContextEstimate { tokens: number; limit: number; ratio: number }

export interface ContextEstimator {
  /** Called for every turn the runtime already observes. */
  record(input: { role: "user" | "assistant" | "tool" | "delegation"; text: string }): void;
  estimate(): ContextEstimate;
  reset(): void;
}

export interface HandoffConfig {
  enabled: boolean;
  contextLimitTokens: number;   // provider limit, configured not discovered
  prepareThreshold: number;     // ratio, default 0.70
  readyTimeoutMs: number;       // default 20_000
  idleWaitTimeoutMs: number;    // default 30_000
}
```

The estimate is runtime-measured — it counts what the runtime sent and received
and never waits on a provider signal. A deliberately conservative
characters-per-token divisor is used and recorded in `ARCHITECTURE.md`;
under-estimating context is the dangerous direction, so the divisor errs toward
reporting more tokens than there are.

The estimator resets on `commit`, seeded with the compacted context — that is
what makes the handoff buy headroom rather than just deferring the problem.

### Tests

`assistant-runtime/tests/handoff-trigger.test.ts` (new)

- Crossing `prepareThreshold` fires exactly one `prepare`, not one per turn.
- A conversation that plateaus at `0.5` never triggers.
- With `prepareThreshold: 0.70` and a limit of 100k, the remaining 30k of
  headroom exceeds `readyTimeoutMs` worth of speech at a documented
  tokens-per-second rate — asserted numerically, so a future threshold change
  that breaks the margin fails the test.
- `reset()` after commit lowers the estimate to the compacted size.

---

## Milestone 4 — Compaction through the broker

Repository: `assistant-runtime`.

### Files

| File | Change |
| --- | --- |
| `src/handoff/compaction.ts` | New. Builds the request, parses the result. |
| `src/handoff/coordinator.ts` | Call the broker during `prepare`. |
| `src/observability/usage-store.ts` | Add `"compaction"` as a metered category. |

### Contracts

```ts
export interface CompactedContext {
  summary: string;
  /** Facts the summary asserts, each already written to memory-core. */
  retainedFacts: string[];
  sourceTurnCount: number;
}
```

Compaction is an ordinary `DelegationRequest` submitted to the existing
`RuntimeDelegationBroker` with `delivery: { mode: "silent" }` — the result must
never be spoken. The live session is untouched for the whole execution, which is
the property Milestone 4's test exists to prove.

The compacted text is injected into the replacement as a
`RealtimeContextEvent` with `source: "system"`, carrying the same
data-not-instructions framing the delegation path already uses. A summary is
data about the conversation; it does not become an instruction because it is
prose.

Metering: compaction spend is recorded under its own category so voice,
delegation, and compaction are separable in `RuntimeUsageStore`.

### Tests

`assistant-runtime/tests/handoff-compaction.test.ts` (new)

- The live session sends and receives audio throughout a compaction that takes
  longer than several turns — asserted by frame counts on the active session
  during the pending execution.
- A compaction that rejects aborts the handoff with `COMPACTION_FAILED` and
  leaves the original session bound and speaking.
- A compaction that returns unparseable output aborts rather than injecting it.
- A compaction that exceeds its deadline aborts.
- `RuntimeUsageStore` reports three distinct categories after a session
  containing voice, a delegation, and a compaction.

---

## Milestone 5 — Idle-gap cutover

Repository: `assistant-runtime`.

### Files

| File | Change |
| --- | --- |
| `src/delegation/delivery.ts` | Extract idle observation into a reusable notifier. |
| `src/handoff/coordinator.ts` | Wait on the notifier before `commit`. |

`DelegationDeliveryScheduler` already tracks speaking state in
`markOutputStarted` / `markOutputFinished`. Rather than duplicating it, the
scheduler gains:

```ts
public onIdle(sessionId: string, listener: () => void): () => void;
public isIdle(sessionId: string): boolean;
```

`markOutputFinished` notifies listeners after its existing `drain`. No second
idle detector is introduced — the workplan is explicit that forking this
mechanism is the failure mode to avoid.

User speech counts as non-idle: the coordinator also holds off while the runtime
has an open user turn, which it already tracks for barge-in.

### Tests

`assistant-runtime/tests/handoff-idle-cutover.test.ts` (new)

- Commit does not occur while `markOutputStarted` is outstanding; it occurs on
  the first `markOutputFinished`.
- Commit does not occur while a user turn is open.
- A session that never goes idle aborts on `idleWaitTimeoutMs` with
  `NO_IDLE_GAP` and keeps the original session.
- A user who starts speaking between "idle observed" and "commit executed" does
  not get cut over mid-utterance — the commit re-checks idleness at the moment
  of the swap.

`assistant-runtime/tests/delegation-idle-delivery.test.ts` (extend)

- The existing `when_idle` delivery behaviour is unchanged by the refactor.

---

## Milestone 6 — Realtime Core multi-session

Repository: `speech-system/realtime core`.

### Files

| File | Change |
| --- | --- |
| `src/runtime.ts` | `RealtimeCore` holds a session registry and an active id. |
| `src/contracts.ts` | Add `RealtimeSessionHandle`. |
| `src/index.ts` | Export it. |
| `README.md`, `ARCHITECTURE.md` | State that Realtime Core does not know what a handoff is. |

### Contracts

```ts
export interface RealtimeSessionHandle {
  readonly id: string;
  readonly session: RealtimeSpeechSession;
  readonly active: boolean;
}

// RealtimeCore
open(config: RealtimeSessionConfig): Promise<RealtimeSessionHandle>;
activate(sessionId: string): void;   // synchronous; the swap must not await
active(): RealtimeSessionHandle | null;
close(sessionId: string): Promise<void>;
sessions(): RealtimeSessionHandle[];
```

`connect()` is retained as `open()` plus `activate()` so existing callers and
tests keep working.

`activate` is deliberately synchronous. An `await` between deactivating one
session and activating the next is a window in which zero sessions own audio —
which is the same defect as two owning it, just quieter.

The words `handoff`, `prepare`, `commit`, and `compaction` must not appear in
this repository's source. A grep test enforces it.

### Tests

`speech-system/realtime core/tests/multi-session.test.ts` (new)

- Two open sessions; exactly one reports `active` at every point.
- `activate` on an unknown id throws `RealtimeError` with `SESSION_CLOSED`.
- `close` on the active session leaves no active session rather than silently
  promoting another.
- Audio sent to `active()` reaches only that session.

`speech-system/realtime core/tests/vocabulary.test.ts` (new)

- Source tree contains no handoff vocabulary. Guards the boundary the workplan
  draws around this repository.

---

## Milestone 7 — Integration, AEC, and observability

Repositories: `assistant-runtime` (primary), `aec-system` (verification only).

### Files

| File | Change |
| --- | --- |
| `assistant-runtime/src/handoff/state-publisher.ts` | New. Publishes to State Core. |
| `assistant-runtime/src/handoff/metrics.ts` | New. Bounded counters and histograms. |
| `assistant-runtime/src/echo-cancellation.ts` | Rebind the AEC reference on commit. |
| `assistant-runtime/src/composition.ts` | Wire coordinator, estimator, publisher. |
| `README.md`, `ARCHITECTURE.md`, `PROGRESS.md` in every affected repository | Update. |

### Contracts

State Core keys, written through the existing `StateRuntime.set` with
`source: { sourceType: "system", sourceId: "assistant-runtime" }`:

```text
assistant.session.logical_id      string
assistant.session.handoff_state   "idle" | "handoff_pending" | "handoff_active"
assistant.session.handoff_reason  string | null
```

No `state-core` code changes. Handoff is data in a generic store, which is what
that repository is for.

Metrics, all bounded:

```text
handoff.prepare_latency_ms      histogram
handoff.wait_for_idle_ms        histogram
handoff.overlap_ms              histogram
handoff.aborts_total            counter, by failure reason
handoff.commits_total           counter
compaction.cost                 by category, from RuntimeUsageStore
```

AEC: the echo canceller holds a reference to the playback path. A commit changes
that path, and a stale reference means the assistant stops recognising its own
voice and starts answering itself. The wiring calls the existing AEC reset on
commit and re-establishes the reference against the new session before the first
frame of replacement audio plays.

### Tests

`assistant-runtime/tests/handoff-state-publish.test.ts` (new)

- `handoff_pending` appears on prepare, `handoff_active` during commit, `idle`
  after teardown; the logical id never changes.
- An abort returns the state to `idle` with the failure reason recorded.

`assistant-runtime/tests/handoff-echo-wiring.test.ts` (new)

- The AEC reference points at the replacement session after commit.
- No frame of replacement playback is processed against the old reference.

`assistant-runtime/tests/handoff-correlation.test.ts` (new)

- A delegation submitted before commit and completing after it is delivered to
  the replacement session under the same logical id.
- Usage records before and after a commit aggregate under one logical session.

`assistant-runtime/tests/handoff-resilience.test.ts` (new)

- Provider disconnect during each of `prepare`, `ready`, and `commit`.
- Runtime shutdown during each phase leaves no orphaned session.

### Live verification

Against the real Gemini provider, on hardware, recorded in `PROGRESS.md`:

- one conversation crossing at least one handoff, with the audio recorded and
  the gap measured rather than judged by ear;
- measured prepare latency and overlap duration, compared against the
  Milestone 3 headroom margin;
- an explicit list of what remains provider-unverified.

---

## Sequencing

```text
M1  memory-core          independent, start now
M2  contracts + fake     independent of M1
M3  estimation           needs M2 contracts
M4  compaction           needs M2, M3
M5  idle cutover         needs M2
M6  realtime multi       independent of M3–M5, needed by M7
M7  integration          needs all
```

M1 and M2 can proceed in parallel; they share no files. M6 can proceed in
parallel with M3–M5. M7 is the only true barrier.

---

## Verification per repository

```bash
npm run verify
```

Run in `memory-core`, `assistant-runtime`, `state-core`, `aec-system`, and
`speech-system/realtime core`. Each is `typecheck && test && build`; `state-core`
additionally runs its CLI health check.

`state-core` and `aec-system` gain no source changes — their verify runs prove
the integration did not regress them.

---

## What this plan refuses to do

No step here warms a provider instance, transfers key-value cache, or cuts over
inside a generation. The commit is a swap of which session owns the microphone
and the speaker, taken during a gap the conversation produced on its own. If a
future change to this plan requires knowing what is inside the provider's
inference state, that change is out of scope and belongs to a different
workplan.
