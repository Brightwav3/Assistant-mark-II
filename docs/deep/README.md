# Rozbory — long-form reconstruction

Documents in this directory are written **for a human reading voluntarily**: to
understand how a part of this system works, or to build something like it.

They are the one genre in this ecosystem with no enforcement mechanism, on purpose.
A rozbor is the most expensive document to write and the fastest to rot, so it is
produced on intent rather than on trigger.

## What belongs here

- A narrative reconstruction of how a subsystem was built and why it took the shape
  it did.
- Enough detail that a reader could build something equivalent.
- Material too long to be useful to an agent looking for one answer.

## What does not

| Wanted | Belongs in |
| --- | --- |
| A rule an agent must follow | that repository's `CLAUDE.md` / `AGENTS.md` |
| A rule crossing repositories | [`INVARIANTS.md`](../../INVARIANTS.md) |
| Why one boundary is the way it is | that repository's `docs/decisions/` |
| The current shape of a component | that repository's `ARCHITECTURE.md` |

If an agent must find it, it does not belong here. Nothing loads this directory and
nothing tests it.

## Rules

1. **Written after a milestone completes**, not during.
2. **Dated as a snapshot** — "this is how it looked on 2026-08-15" — and never
   maintained as live truth. A rozbor that claims to be current will be wrong and
   will not announce it.
3. **Filename carries the date**: `YYYY-MM-DD-topic.md`.
4. **Never the only home for a decision.** If a rozbor is the only place a piece of
   reasoning exists, that reasoning is unreachable — write the ADR first.

## Related

[`README AGENTS.md`](../../README%20AGENTS.md) in the repository root is a rozbor by
genre: the manifesto in full, from which [`manifesto/`](../../manifesto/README.md)
is derived. It predates this directory and is left in place.

## Index

### [Two clock domains: where software echo cancellation runs out of road](2026-08-15-two-clock-domains.md)

Why an assistant hears itself, why the fix is not the one you reach for first, and
what clock drift costs — measured, at 58 dB against 12 dB. Covers the gate/adaptive
trade-off, delay estimation, the two failure modes that decide whether a filter
works in a conversation rather than a test, and why honest metrics are an
architectural property. Read this before buying a Bluetooth adapter.

### [Why a voice assistant needs two models](2026-08-15-why-an-assistant-needs-two-models.md)

Four seconds of silence in a spoken conversation is not a pause — and a model given
silence will fill it with an answer it never obtained. How a broker removes the gap
instead of shortening it, how to decide which of two homes a new capability belongs
in, and why a background result must never re-enter as something the user said.

### [Staying interrupted](2026-08-15-staying-interrupted.md)

Cancellation stops work from starting; it cannot recall work already in flight.
The authority-generation pattern, why the check belongs at the last boundary before
the effect, and what five components in this system arrived at independently before
anyone wrote it down. Not audio-specific.

---

*Candidates not yet written: session handoff and live context compaction; how a
capability reaches the world safely; episodes versus semantic memory; why agents
forget architectural decisions.*
