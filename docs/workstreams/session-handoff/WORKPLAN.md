# M.A.R.K. II Session Handoff and Live Context Compaction Workplan

## Project

M.A.R.K. II — session handoff and live context compaction for a long-running
realtime voice session.

This workplan is the successor to `WORKPLAN.md`, which is delivered: delegated
voice intelligence was verified on real hardware on 2026-08-14, with a Gemini
Live session acknowledging a delegation immediately, running `memory_search`
then `memory_view` in the background, and speaking the result about two seconds
later.

That workplan answered *who does the thinking*. This one answers *how the
conversation survives its own length* — and it builds on the mechanisms the
first one left behind rather than starting from an empty page.

## Goal

Let a realtime voice conversation outlive the limits of the session carrying it,
without the user hearing that anything happened.

```text
Realtime session A                  Realtime session B
    │ conversation continues
    │
    ├── context estimate crosses the prepare threshold
    │
    │        compaction runs as a delegation ─────┐
    │        (off the live path)                  │
    │                                             ▼
    │                                   session B is opened and
    │                                   prefilled with compacted
    │                                   context
    │
    │        B reports ready ────────────────────►│
    │                                             │
    ├── wait for an idle gap                      │
    │                                             │
    └── commit: B becomes active ─────────────────┘
        A is torn down
```

The user-visible requirement is negative, which is what makes it hard to fake:

```text
No gap in the audio.
No repeated question.
No forgotten name that was mentioned two minutes ago.
No moment where the assistant answers as if the conversation had just begun.
```

## Core principle

**The runtime holds the conversation. The session only renders it.**

Every other decision in this workplan follows from that inversion. If the
authoritative record lives in the realtime session, the session cannot be
replaced and its limits become the conversation's limits. If the record lives in
the runtime, a session becomes a replaceable rendering surface, and replacing it
is an operational event rather than the end of the conversation.

## What is deliberately not available

OpenAI has described solving this inside their own inference layer: warming a
replacement model instance, prefilling it from the live one, running inference
against both in parallel, and cutting over mid-stream.

That approach depends on access to the model instances and their key-value
cache. As an API client of Gemini Live we have neither. We cannot warm a
provider instance, cannot transfer cache state between sessions, and cannot cut
over inside a generation.

This is recorded here as a constraint, not a limitation to be worked around
later. **No part of this workplan may be designed, documented, or implemented as
though provider-side instance warming were available.** An implementation that
quietly assumes it will produce a handoff that appears to work in tests and
drops audio in production.

What replaces it is the inversion above, plus one observation: we do not need
mid-stream cutover, because we can wait. A real conversation produces a gap
within seconds, and a gap is a cheaper cutover point than any amount of parallel
inference.

## Scope

### In scope

- Memory import, migration inspection, and documented recovery in `memory-core`
  — the prerequisite that makes a lossy compaction safe to commit to.
- A provider-neutral session handoff contract with explicit `prepare`, `ready`,
  `commit`, and `teardown` phases.
- Runtime-measured context estimation and a prepare threshold derived from it.
- Compaction executed through the existing Delegation Broker as an ordinary
  background execution.
- Idle-gap detection reused from the existing delivery scheduler.
- Realtime Core holding more than one session and switching which is active.
- Published `handoff_pending` / `handoff_active` state through State Core.
- Abort-and-retain behavior when a replacement is not ready in time.
- Verification that echo cancellation survives a change of playback path.
- Deterministic fake-provider tests for every phase, including the failure ones.

### Explicitly out of scope

- Any claim of provider-side instance warming, key-value cache transfer, or
  mid-generation cutover.
- Cutting over while the user is speaking.
- Handoff across providers, models, or voice configurations. Same provider, same
  configuration, new session.
- Semantic or embedding-based compaction. Compaction here is summarization
  through the existing delegation path.
- Changing what Memory Core stores or how it decides to store it.
- Full duplex audio.
- Making compaction user-visible as a feature, a setting, or a spoken message.

## What this inherits

`WORKPLAN.md` is complete. Its Delegation Broker, delivery scheduler, and
lifecycle events are shipped, tested, and hardware-verified — which is the
reason this workplan can be as small as it is.

A handoff needs exactly the lifecycle the broker already implements: prepare
work in the background, observe it, reach exactly one terminal outcome, and act
on a gap in the conversation. Building a second implementation of that would
fork a settled mechanism into two that drift apart.

So this workplan adds a coordinator and a trigger. It does not add a lifecycle.

What is reused rather than rebuilt:

| Existing mechanism | Role in handoff |
| --- | --- |
| `DelegationDeliveryScheduler.rebind` | Re-points a session id at a new transport and drains what was queued. Handoff extends this with a prepared replacement instead of a reconnect. |
| `markOutputStarted` / `markOutputFinished` | Already the idle detector the cutover needs. |
| `when_idle` delivery policy | Already the policy that waits for a gap. |
| Broker terminal-event idempotency | The property a commit needs. A half-committed handoff leaves two live sessions against one microphone. |
| Delegation Broker | Runs the compaction itself, keeping it off the live path. |

## Ownership and neighboring repositories

| Responsibility | Owner |
| --- | --- |
| Holding multiple provider sessions and switching the active one | `speech-system/realtime core` |
| Handoff lifecycle, thresholds, phase transitions, abort policy | `assistant-runtime` |
| Running the compaction as a delegated execution | `intelligence-core` |
| Publishing handoff status | `state-core` |
| Surviving a changed playback path | `aec-system` |
| Whatever compaction drops must remain recoverable | `memory-core` |

`assistant-runtime` owns the lifecycle. Realtime Core gains the ability to hold
a second session but must not learn what a handoff is: it exposes open, ready,
activate, and close, and the runtime decides when those happen.

No repository outside `assistant-runtime` may initiate a handoff.

## Target architecture

```text
Assistant Runtime
    │
    ├── context estimator ── crosses prepare threshold
    │                             │
    │                             ▼
    │                     Handoff Coordinator
    │                             │
    │      ┌──────────────────────┼──────────────────────┐
    │      ▼                      ▼                      ▼
    │   PREPARE                 READY                 COMMIT
    │   compaction via       replacement          swap active session
    │   Delegation Broker    session prefilled    on an idle gap
    │   + open replacement   and acknowledged     then TEARDOWN
    │
    ├── idle detection ◄── markOutputStarted / markOutputFinished
    │
    └── State Core ◄── handoff_pending / handoff_active
```

The active session is addressed by a stable logical session id that does not
change across a handoff. Everything downstream — delivery queues, correlation
ids, traces, usage records — keeps referring to the same conversation.

## Public contract requirements

Names may change during implementation planning; the semantics may not.

### Phases

```text
prepare    a replacement is being created and prefilled
ready      the replacement has acknowledged its context and can take audio
commit     the replacement becomes active; atomic and idempotent
teardown   the previous session is closed
abort      the attempt ends and the current session is retained
```

A replacement that never reaches `ready` must never be committed. `commit` must
be idempotent for the same reason terminal delegation events are: a retry racing
a completion must produce one outcome, not two live sessions.

### Lifecycle events

```text
handoff.prepared
handoff.ready
handoff.committed
handoff.aborted
handoff.failed
compaction.started
compaction.completed
compaction.failed
```

Every event must carry the logical session id, the physical session ids on both
sides, the reason that triggered the attempt, and a safe failure reason on the
terminal paths.

### Trigger

The trigger must be a **runtime-measured context estimate**, not a provider
signal. Realtime providers do not reliably announce that a limit is near, and a
runtime that waits to be told will be told too late or not at all.

The threshold must sit far enough below the limit to absorb prefill latency,
which is measured in seconds. Preparing at the limit is preparing too late.

### Abort policy

If the replacement is not ready before its deadline, the attempt aborts and the
current session is retained. Degrading to the session that still works is
correct. Cutting to a half-prepared one is not.

An abort must be reported, not silently retried. A handoff that keeps failing
is a real condition — the alternative is a conversation that dies at the context
limit with no trace of the attempts that preceded it.

## Safety and trust boundaries

- Compaction is lossy by construction. What it drops must already be recoverable
  from Memory Core, or it is gone. Compaction must not be the only writer of any
  fact. Memory Core cannot honour this today — it can export but not import —
  which is what Milestone 1 exists to fix before anything lossy is committed to.
- Compacted context passes through the delegation model. Memory content is data,
  not instructions, and that rule does not relax because the text is a summary.
- A handoff must not be observable to the user as a message, a tone, or a pause.
  It is an operational event, not a conversational one.
- Two sessions exist during the overlap. Exactly one may receive microphone
  audio and exactly one may produce playback, at every instant, including during
  an abort.

## Accepted costs

Stated here so they are decided rather than discovered:

- **Double billing during overlap.** Both sessions are live for seconds, not
  minutes, but the cost is real and must appear in usage metering as such.
- **Lost prosody.** The replacement does not inherit the current session's tone.
  A cutover in the middle of an emotionally loaded passage is audible even when
  the words are perfect.
- **Lossy compaction.** See the trust boundary above.

## Implementation milestones

### Milestone 1 — Memory durability prerequisite

Compaction is lossy on purpose. The trust boundary above says what it drops must
already be recoverable from Memory Core — and today that is only half true.
Memory Core can export (`memory-core/cli/main.ts export`) but cannot import, so
the data has a way out and no verified way back in. Migration from schema v1 to
v2 is done and idempotent; inspection and recovery around it are not.

Committing a lossy transformation on top of a one-way door is the wrong order,
which is why this comes first rather than being scheduled after the interesting
work.

- Add import to `memory-core`, as the exact inverse of the existing export:
  a round trip must reproduce records, identifiers, provenance, and lifecycle
  state, not merely the content.
- Refuse a partial import rather than half-applying it. An import that fails
  mid-file must leave the store as it was.
- Add a migration inspection and dry-run command that reports what a migration
  would change without changing it.
- Document backup and recovery: what to copy, how to verify the copy is
  restorable, and how to restore it.
- Prove the round trip against a store carrying legacy v1 records, not only a
  freshly created one.

This milestone belongs to `memory-core` alone. Nothing in it touches the
realtime path, and it is independently useful whether or not the rest of this
workplan is ever built.

### Milestone 2 — Contract and fake provider

- Define the handoff phases, events, and logical/physical session identity.
- Extend the fake realtime provider to hold two sessions and report readiness.
- Prove `prepare → ready → commit → teardown` and every abort path offline.
- Prove that exactly one session owns audio at every instant.

### Milestone 3 — Context estimation and trigger

- Add runtime-side context estimation for an active session.
- Add the prepare threshold and its configuration.
- Prove the trigger fires early enough to absorb a realistic prefill.
- Prove no trigger fires for a conversation that never approaches the limit.

### Milestone 4 — Compaction through the broker

- Route compaction through the existing Delegation Broker.
- Prove the live session keeps talking for the whole compaction.
- Prove a failed compaction aborts the handoff and retains the session.
- Meter compaction separately from voice and from ordinary delegation.

### Milestone 5 — Idle-gap cutover

- Reuse the existing idle detection to select the cutover point.
- Prove no cutover occurs while the assistant is speaking or the user is
  talking.
- Prove a session that never goes idle aborts on its deadline rather than
  cutting over mid-speech or waiting forever.

### Milestone 6 — Realtime Core multi-session

- Let Realtime Core hold more than one session and switch the active one.
- Keep the handoff concept out of Realtime Core entirely.
- Prove the logical session id is stable across a commit for every downstream
  consumer.

### Milestone 7 — Integration, AEC, and observability

- Verify echo cancellation survives the changed playback path. An assistant that
  stops recognizing its own voice starts answering itself.
- Publish `handoff_pending` / `handoff_active` through State Core.
- Add bounded metrics for prepare latency, wait-for-idle duration, overlap
  duration, abort rate, and compaction cost.
- Verify against the live Gemini provider, and record what remains unverified.
- Update README, ARCHITECTURE, and PROGRESS in every affected repository.

## Testing strategy

Tests must cover:

- every phase transition, including each abort path;
- the invariant that exactly one session owns audio at every instant;
- a replacement that never becomes ready;
- a replacement that becomes ready after its deadline;
- a compaction that fails, times out, or returns an unusable result;
- a session that never goes idle;
- a user speaking across the intended cutover point;
- provider disconnection during each phase;
- runtime shutdown during each phase;
- correlation identity surviving a commit;
- separate metering of voice, delegation, and compaction spend.

Every failure path must be provable offline against the fake provider. Live
provider testing verifies latency and audio continuity, not correctness.

## Definition of Done

This workplan is complete only when:

- a memory export and import round trip reproduces records, identifiers,
  provenance, and lifecycle state, including for a store carrying legacy v1
  records, and a failed import leaves the store unchanged;
- backup and recovery are documented well enough to be followed without reading
  the source;
- a conversation continues across at least one handoff with no audible gap;
- context compaction runs without interrupting the live session;
- the cutover happens in an idle gap and never mid-speech;
- a replacement that fails to become ready aborts and retains the working
  session;
- exactly one session owns microphone and playback at every instant, in every
  tested path including aborts;
- echo cancellation is verified across a cutover;
- the logical session id is stable across a handoff for every downstream
  consumer;
- handoff status is published and observable rather than inferred from silence;
- compaction spend is metered separately from voice and delegation spend;
- no provider-side instance warming, cache transfer, or mid-generation cutover
  is claimed anywhere in the code or documentation;
- typecheck, unit tests, integration tests, build, and repository verification
  pass for every affected repository;
- documentation states what is verified, what is degraded, and what remains
  provider-unverified.

## Stop condition

Stop after the Definition of Done above. Do not extend into cross-provider
handoff, semantic compaction, full duplex audio, or changes to what Memory Core
stores.

## Required next artifact — detailed implementation plan

Before implementation begins, produce a milestone-level plan that names the
exact files and contracts to be added or changed in `memory-core`,
`speech-system`, `assistant-runtime`, `state-core`, and `aec-system`, and the
test that proves each one. This workplan defines the destination; it is not
itself the plan.
