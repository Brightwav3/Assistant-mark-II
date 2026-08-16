# Invariants

Rules that hold across repository boundaries. This file is the sole authority for
them.

Each invariant is quoted **verbatim** in the `CLAUDE.md` and `AGENTS.md` of every
repository it governs. That duplication is deliberate: a repository's instruction
file is loaded into an agent's context automatically, and this file is not. A link
here would only be followed by an agent that already suspected the rule existed.

## How to use this file

- An invariant is written **only after** the ADR that establishes it. A rule
  invented before the case is examined will forbid work that turned out to be
  correct.
- Changing an invariant's sentence means updating every governed repository's
  instruction files in the same change. A structure test compares them.
- A decision that governs one repository only does not belong here. It belongs in
  that repository's `docs/decisions/`.

---

## INV-001 — Synchronous capabilities are declared in Host Tools

> A capability that can produce its answer within the turn that requested it is
> declared in `host-tools` and executed by `tool-system`. It reaches the world
> only through an injected service, never through a direct import of a process,
> filesystem, network, or automation primitive.

- **Governs:** `host-tools`, `tool-system`, `assistant-runtime`
- **Established by:** [ADR 0001](docs/decisions/0001-capability-homes.md)
- **Known exception:** `tool-system/src/tools/open-app.ts` is the single reference
  tool demonstrating the declaration contract. No second one is added.

## INV-002 — Asynchronous capabilities are brokered

> A capability that cannot produce its answer within the turn that requested it is
> routed through the Delegation Broker, which mints its execution identity before
> any work begins, so that a model holding the turn has something real to
> acknowledge and no silence to fill with an invented result.

- **Governs:** `assistant-runtime`, `intelligence-core`
- **Established by:** [ADR 0001](docs/decisions/0001-capability-homes.md)

## INV-003 — Every host effect passes one brokered, deniable place

> A capability never imports a spawn, filesystem, network, or automation
> primitive. Every effect on the world outside the process arrives through an
> injected service with an allowlist, and no service accepts a composed
> instruction — a shell string, a full URL — where it can accept parts.

- **Governs:** `host-tools`, `tool-system`
- **Established by:** [ADR 0001](docs/decisions/0001-capability-homes.md),
  `tool-system/docs/decisions/0002-broker-is-the-only-host-path.md`

## INV-004 — A superseded result is dropped at the boundary, not delivered

> Every asynchronous turn carries a monotonically increasing authority generation.
> Cancellation, barge-in, interruption, or supersession advances it, and a result
> belonging to an older generation is dropped at the last boundary before its
> effect. Cancellation stops work from starting; it cannot recall work already in
> flight.

- **Governs:** `speech-system`, `assistant-runtime`, `intelligence-core`
- **Established by:** [ADR 0002](docs/decisions/0002-authority-generation.md)

## INV-005 — A delegated tool failure remains a failed delegation

> Every delegated result is authoritative only if all tool executions in that request succeeded; a tool failure makes the delegation failed and the result must not be delivered as completed.

- **Governs:** `assistant-runtime`, `intelligence-core`
- **Established by:** [ADR 0003](docs/decisions/0003-delegation-tool-failures-remain-failed.md)

---

## Pending

Invariants expected once the ADRs establishing them are written. Listed so the
gap is visible, not so it is assumed filled.

- **Zero imports between cores.** The ADR now exists —
  [`assistant-runtime/docs/decisions/0001-zero-imports-between-cores.md`](assistant-runtime/docs/decisions/0001-zero-imports-between-cores.md).
  Promotion to `INV-004` is deferred until every governed repository has
  instruction files, so the sentence can be quoted into all of them in one change
  rather than leaving known drift behind.
- **Identity and provider independence:** no runtime contract, event name, header,
  or identifier embeds an assistant name or a model provider. Stated as a rule in
  several instruction files; no ADR establishes it yet.
