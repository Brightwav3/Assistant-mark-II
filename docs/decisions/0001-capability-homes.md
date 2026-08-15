# ADR 0001: A capability's home is decided by whether it can answer within its turn

- **Status:** Accepted
- **Date:** 2026-08-15
- **Decision owners:** M.A.R.K. II architecture
- **Scope:** `tool-system`, `host-tools`, `assistant-runtime`, `intelligence-core`

## Context

Agent-callable capabilities currently live in three places, and nothing states
which one is correct for a new capability:

1. `host-tools/src/tools/` — the catalogue: `get_time`, `calculate`, `uptime`,
   `system_status`, `web_search`, `weather_report`, `open_url`, `set_volume`,
   `screen_capture`.
2. `tool-system/src/tools/open-app.ts` — a reference tool shipped inside the
   runtime that executes tools, used by the diagnostic CLI and by
   Assistant Runtime's tests.
3. `assistant-runtime/src/delegation/` — `memory-tools.ts`,
   `memory-create-tool.ts`, `episode-tools.ts`.

An agent adding a capability reads `host-tools/ARCHITECTURE.md`, finds a
description of how the catalogue works, finds no statement that the catalogue is
exclusive, observes two counter-examples in the tree, and picks whichever home
its immediate problem fits. That is what happened when the memory tools were
added: Host Tools accepts only injected services (`HttpBroker`, `SystemProbe`,
`VolumeControl`, `ScreenCapture`, `ProcessBroker`) and has no slot for Memory
Core or episode state, so the delegation directory was the only place the
capability could be built at all.

The placement was correct. The reason was never written where the question is
asked. It exists only in the header of
`assistant-runtime/src/delegation/broker.ts`, which answers *what does this
broker do* rather than *where does a new capability belong*.

## Decision

The dividing question is **can this capability produce its answer inside the turn
that requested it.**

### Synchronous capabilities — Host Tools

A capability that answers within its turn is declared in `host-tools` and
executed by `tool-system`. It reaches the world only through an injected service,
never through a direct import of `child_process`, `fs`, `fetch`, or an automation
library. Host Tools declares; Tool System validates, binds, consults policy,
applies guards, invokes, and classifies.

`ScreenCapture` shows the boundary of "within its turn": it is slow, so it
returns a `continuation` outcome — an immediate acknowledgement plus an id — and
is still a Host Tool, because the *acknowledgement* is synchronous and the
runtime, not the model, owns the wait.

### Asynchronous capabilities — the Delegation Broker

A capability that cannot answer within its turn is routed through the Delegation
Broker in `assistant-runtime/src/delegation/`. The broker mints an execution
identity and returns it before any work begins, so a model holding the turn has a
real thing to acknowledge and correlate against.

This is not a convenience. A voice model that is asked a question and given
silence will fill the silence, and what it fills it with is a plausible answer it
has not obtained. The broker exists to remove the gap rather than to shorten it.
Authority stays with the runtime: the model requests, the broker decides model
selection, limits, deadlines, cancellation, and delivery.

### Reference tools — Tool System, and only these

`tool-system/src/tools/open-app.ts` remains where it is, as the single worked
example of the declaration contract, consumed by the diagnostic CLI and by tests.
It is not a general-purpose home. No second reference tool is added; a capability
intended for use by an assistant goes to Host Tools or the broker.

## Rejected alternatives

### Move the delegation memory tools into Host Tools

Rejected. It would require Host Tools to accept Memory Core and episode state as
services, which puts a stateful, session-scoped dependency into a library whose
testability rests on every capability being a pure function of injected effects.
More importantly, executing them synchronously would restore the silence the
broker was built to remove, and the hallucinated-result failure with it.

### Move `open_app` into Host Tools and forbid tools in Tool System entirely

Rejected for now. `open_app` is the contract's worked example and is exercised by
Tool System's own CLI; moving it would make the runtime's diagnostics depend on
the catalogue, inverting the dependency direction the two repositories were split
to establish. The cost of keeping it is one documented exception, recorded here.

### Split by capability domain — "memory tools live with memory, host tools with the host"

Rejected. Domain is the criterion an agent reaches for first and it produces the
wrong answer, because it says nothing about who holds the turn. A fast memory
lookup and a slow web search would land in different homes under a domain rule
while having identical latency behaviour, which is the property that actually
governs correctness here.

### Declare everything in Host Tools and let the runtime decide asynchrony

Rejected. It moves the decision from declaration time to dispatch time, which
makes it invisible in the declaration a model reads. A capability's latency class
is part of its contract, not an implementation detail of the caller.

## Consequences

### Positive

- A new capability has one question to answer, and the answer is observable
  rather than a matter of taste.
- The three existing homes become a taxonomy with two general categories and one
  named exception, instead of three undocumented precedents.
- The hallucination protection has a stated reason, so a future agent optimising
  for fewer moving parts will not remove it.

### Costs

- Host Tools cannot serve capabilities needing session-scoped runtime state, so
  such capabilities must be built in the delegation path even when they are fast.
- The `open_app` exception must be defended each time someone notices it, which
  is why it is written down here rather than left to be rediscovered.
- Two homes means two registration paths to keep in step.

## Enforced in

- `tool-system/src/tools/open-app.ts`
- `host-tools/src/catalogue.ts`
- `assistant-runtime/src/delegation/broker.ts`

## Explicit non-decisions

This ADR does not decide which policy engine judges either category, does not
authorize Host Tools to accept stateful services, does not authorize a second
reference tool inside Tool System, does not define the delivery mechanism for
delegated results, and does not rule on whether a future Interaction Core changes
who owns the turn.
