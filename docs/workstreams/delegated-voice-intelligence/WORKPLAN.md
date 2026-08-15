# M.A.R.K. II Delegated Voice Intelligence Workplan

## Project

M.A.R.K. II — delegated voice intelligence for a model-independent personal
assistant.

## Goal

Make a half-duplex realtime voice session feel like one assistant while two
different model roles work together:

```text
Voice model
    → immediate conversation and acknowledgement
    → asynchronous delegation request

Delegation model
    → deeper reasoning, search, and tool use in the background

Assistant Runtime
    → lifecycle, correlation, cancellation, scheduling, and delivery
```

The first user-visible capability is:

```text
User:  Pamatuješ si, jak jsme řešili toho nového robota?

Voice model:
       delegate_to_intelligence({
         goal: "Najdi relevantní vzpomínky o novém robotovi"
       })

Assistant:
       Podívám se na to.

Background delegation model:
       memory.search("nový robot")
       memory.view(...)
       compare and select candidates

Assistant:
       Našel jsem tři možnosti. Myslíte robota z MIT, robota pro Mars,
       nebo projekt s ponorkou?
```

The system must support this behavior with the current Gemini voice setup and
remain ready for a future GPT Live 1-style provider with native asynchronous
delegation.

## Core principle

Asynchronous delegation is a first-class provider-neutral capability.

The Assistant Runtime owns orchestration and authority. The voice model may
request delegation, but it does not own model selection, memory access, tool
permissions, task lifecycle, or result delivery.

Provider adapters may expose different levels of support:

```text
native async       provider continues while the delegated work runs
blocking           provider waits for the tool result
degraded async     runtime returns an acknowledgement and delivers the result
                    later through a new turn or queued context event
```

Gemini 3.1 is allowed to use the degraded path. Gemini 2.5 and a future GPT
Live 1-style provider may use native async semantics. The internal contract
must not be designed around any one provider's event names.

## Scope

### In scope

- A provider-neutral async realtime tool and delegation contract.
- A delegation broker inside `assistant-runtime`.
- Correlation between voice session, interaction, delegation, tool calls, and
  returned results.
- Immediate `accepted` responses for background work.
- Result scheduling with `interrupt`, `when_idle`, and `silent` semantics.
- Cancellation, deadlines, session closure handling, and late-result policy.
- A configurable voice model and a separate configurable delegation model.
- Gemini Live as the current voice provider.
- A regular text Gemini model as the initial delegation provider.
- A future provider adapter boundary for GPT Live 1 and a frontier text model.
- `memory.search` as a bounded read-only tool.
- `memory.view` as a bounded read-only tool that exposes a selected memory
  record and limited surrounding conversation context.
- `intelligence.delegate` as a bounded background operation.
- Structured delegation lifecycle events, diagnostics, and audit traces.
- Offline fake-provider tests that exercise native async, blocking, and
  degraded-async behavior.
- One end-to-end deterministic simulation of the robot-memory conversation.

### Explicitly out of scope

- Replacing Gemini Live or implementing a new speech model.
- Implementing GPT Live 1 before its provider adapter is separately scheduled.
- Training, fine-tuning, or benchmarking models.
- Vector search, embeddings, or a complete semantic-memory rewrite.
- A general-purpose autonomous agent with unrestricted shell access.
- A second policy or tool execution system outside Tool System.
- Automatic deletion or correction of memories without explicit user intent.
- GUI, desktop automation, unrestricted computer control, or cloud memory sync.
- Full duplex audio, shared acoustic echo cancellation, or backchanneling.
- Making the delegation model speak directly to the user without the active
  voice-session delivery policy.

## Ownership and neighboring repositories

| Responsibility | Owner |
| --- | --- |
| Realtime provider session and provider translation | `speech-system/realtime core` |
| Conversation/task orchestration and composition | `assistant-runtime` |
| Model gateway, text model action loop, provider selection | `intelligence-core` |
| Durable memory records and retrieval | `memory-core` |
| Tool declarations, validation, policy, guards, broker, taint, outcomes | `tool-system` |
| Deterministic host capabilities | `host-tools` |
| Current state and published lifecycle status | `state-core` |

`assistant-runtime` is the integration owner. It may add thin adapters and
brokers, but it must not absorb Memory Core, Intelligence Core, Tool System, or
provider SDK ownership.

## Target architecture

```text
User audio
    ↓
Realtime voice provider
    ↓ tool.requested
RealtimeCoreAdapter
    ↓
Delegation Broker
    ├── direct read-only memory.search / memory.view
    └── intelligence.delegate
            ↓ accepted
        IntelligenceRuntime
            ↓
        configured text delegation model
            ↓ tool loop
        Tool System → Memory Core
            ↓ execution.completed
        Result Delivery Broker
            ↓ interrupt / when_idle / silent
        same voice session or durable task result
```

The runtime must not present a background result as if it were a new user
message. The provider-neutral contract should distinguish user input,
delegation result, system event, and tool response. Provider adapters may map
those values to their own transport, but the source must remain observable.

## Public contract requirements

The detailed names may change during implementation planning, but the contract
must express these semantics.

### Realtime capability negotiation

The provider capability surface must report at least:

- `toolCalling`: `none`, `blocking`, or `async`;
- whether result scheduling is supported natively;
- whether parallel tool calls are supported;
- whether context/event injection is supported during an active session.

### Tool declaration

Each declared tool must identify:

- stable name and version;
- description and validated input schema;
- read-only or mutating behavior;
- risk level;
- blocking or non-blocking execution preference;
- timeout and cancellation behavior;
- maximum result size;
- owner and audit category.

### Delegation request

The request must carry:

- stable `requestId` and `executionId`;
- `sessionId` and `interactionId` when available;
- user transcript or structured goal;
- selected memory IDs and relevant context, not the whole database;
- selected delegation provider/model policy;
- deadline, cancellation policy, and maximum tool/model calls;
- requested result delivery mode.

### Delegation lifecycle

The runtime must publish machine-readable events for:

```text
delegation.created
delegation.accepted
delegation.started
delegation.progress
delegation.completed
delegation.failed
delegation.cancelled
delegation.delivery.queued
delegation.delivery.sent
delegation.delivery.dropped
```

Every terminal event must retain the correlation IDs and a safe failure reason.

### Memory tools

`memory.search` must:

- default to the active user scope;
- return bounded summaries, IDs, dates, scores, and match reasons;
- enforce a small result limit and token/byte budget;
- be read-only and cancellable;
- exclude forgotten records by default;
- preserve provenance and confidence.

`memory.view` must:

- require an explicit memory ID;
- return only the selected record and bounded context;
- enforce `before` and `after` limits;
- never dump the database;
- preserve source references and status;
- be read-only and cancellable.

`intelligence.delegate` must:

- create a background execution rather than execute arbitrary model prose;
- return an execution reference immediately when possible;
- prevent the voice model from inventing a completed result;
- support cancellation and deadline enforcement;
- route all downstream tools through Tool System.

## Model configuration

The voice and delegation roles must be configured independently.

```json
{
  "voice": {
    "provider": "gemini",
    "model": "gemini-3.1-flash-live-preview"
  },
  "delegation": {
    "provider": "gemini",
    "model": "<available-text-gemini-model>",
    "fallbackModels": []
  }
}
```

The initial delegation model may be any available text Gemini model with
function calling. It must not be selected randomly per request: selection must
be deterministic through configuration so tests, traces, and failures remain
reproducible.

The future GPT Live 1 migration is an adapter/configuration change, not a
rewrite of the delegation contract:

```text
current: Gemini Live voice + Gemini text delegation
future:  GPT Live 1 voice + frontier text delegation
```

## Safety and trust boundaries

- The model is a requester, not an authority.
- Tool System remains the only execution and policy enforcement point.
- Memory content is data, not instructions.
- Background tasks receive only explicitly selected context.
- Mutating memory operations require explicit user intent and audit records.
- Delegation results must be labeled as pending, completed, failed, or
  cancelled; a pending result must never be narrated as a fact.
- Session closure must not silently discard a running delegation unless its
  cancellation policy says so.
- Late results must be queued, dropped, or persisted according to an explicit
  policy and must emit a diagnostic event.
- Logs must redact credentials and avoid persisting raw audio.

## Implementation milestones

### Milestone 1 — Contract and fake async provider

- Extend provider-neutral realtime contracts with async tool capability,
  scheduling, context injection, and lifecycle correlation.
- Add a fake provider that can continue conversation while a tool is running.
- Add fake blocking and degraded providers.
- Prove interruption, cancellation, timeout, late result, and shutdown paths.

### Milestone 2 — Delegation Broker

- Add the runtime-owned broker between realtime events and Intelligence Core.
- Implement `intelligence.delegate` as a bounded continuation/background task.
- Wire `executionId`, `sessionId`, and `interactionId` through all events.
- Deliver results using an explicit source and scheduling mode.
- Keep Tool System as the sole policy/execution boundary.

### Milestone 3 — Memory Recall Loop

- Expose `memory.search` through Tool System.
- Expose bounded `memory.view` through Tool System.
- Add scope, result, token, and context limits.
- Add deterministic tests for the robot/MIT/Mars/submarine disambiguation flow.
- Keep semantic/vector search out of this milestone.

### Milestone 4 — Gemini integration

- Use Gemini Live 3.1 as the current voice provider.
- Use a configured available text Gemini model as the delegation provider.
- Map Gemini 3.1's blocking behavior to the degraded async path.
- Verify that the user can continue speaking while the delegation model works.
- Verify result delivery when the voice model is idle and when it is speaking.

### Milestone 5 — Reliability and observability

- Add health and capability reporting for voice and delegation providers.
- Add bounded metrics for delegation latency, queue time, model calls, tool
  calls, cancellation, and delivery outcome.
- Verify session closure, provider expiration, reconnect, and task persistence
  behavior.
- Update README, ARCHITECTURE, PROGRESS, and relevant API documentation.

### Milestone 6 — Future provider readiness

- Document the mapping required for Gemini 2.5 native non-blocking tools.
- Document the mapping required for a future GPT Live 1 adapter.
- Add provider contract tests that a future adapter must pass.
- Do not implement the GPT Live 1 adapter in this workplan unless separately
  authorized.

## Testing strategy

Tests must cover:

- provider capability negotiation;
- blocking, native async, and degraded async execution;
- immediate acknowledgement without fabricated completion;
- same-session result delivery;
- `interrupt`, `when_idle`, and `silent` scheduling;
- user input arriving while delegation is running;
- cancellation and deadline expiry;
- session close with a running task;
- late result after interruption or reconnect;
- memory scope, limits, provenance, and forgotten records;
- Tool System policy, validation, guards, and structured errors;
- deterministic end-to-end robot-memory conversation;
- clean shutdown and no leaked task promises.

Hardware microphone verification remains separate from deterministic contract
tests. A green fake-provider test does not prove Czech speech recognition,
echo cancellation, or real speaker behavior.

## Definition of Done

This workplan is complete only when:

- a voice session can request `intelligence.delegate`;
- the runtime returns an immediate bounded acknowledgement;
- the configured Gemini text model performs background reasoning and memory
  tool calls;
- the user can continue the conversation while delegation runs;
- the result returns to the same conversation through an explicit scheduling
  policy;
- the robot-memory scenario is deterministic and tested;
- cancellation, deadlines, late results, provider failure, and session closure
  have verified behavior;
- all tools pass through the existing Tool System;
- no model provider leaks into the provider-neutral contracts;
- model roles are independently configurable;
- configured fallback models are actually attempted, in order, when the primary
  model fails — a configured fallback that is never tried is a silent no-op that
  only shows up during the outage it exists for;
- typecheck, unit tests, integration tests, build, and repository verification
  pass for affected repositories;
- documentation states what is verified, what is degraded, and what remains
  hardware- or provider-unverified;
- no credentials, raw audio archive, generated output, or runtime state is
  committed.

## Stop condition

Stop implementation after the Definition of Done for the current Gemini voice
plus Gemini text delegation path. Do not begin GPT Live 1 integration,
semantic-memory search, full duplex audio, or unrelated tool expansion inside
this milestone. Session handoff and live context compaction are scoped
separately in `WORKPLAN-session-handoff.md` and must not be started from here.

## Required next artifact — detailed implementation plan

Before implementation begins, create and review a separate detailed
implementation plan for this workplan. That implementation plan must:

1. identify the exact repositories and files to change;
2. define the final TypeScript interfaces and event schemas;
3. define the order of implementation and dependency build order;
4. specify each test, fixture, fake provider, and failure-path assertion;
5. define migration compatibility for existing realtime tools;
6. define verification commands and evidence required for each milestone;
7. identify unresolved provider/API assumptions and their fallback behavior;
8. stop for user review before code implementation starts.

The implementation plan is a required successor artifact, not part of this
workplan's implementation. No production code should be changed until that
plan exists and has passed its own scope and consistency review.
