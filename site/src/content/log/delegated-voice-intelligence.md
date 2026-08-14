---
title: "Delegated voice intelligence is verified on hardware"
date: 2026-08-14
area: Intelligence
mark: II
status: Ready
summary: "A voice session can hand deeper work to a separately configured reasoning model, keep talking to the user while it runs, and speak the result when it arrives."
---

A voice session can hand deeper work to a separately configured reasoning model, keep talking to
the user while it runs, and speak the result when it arrives.

```text
User speaks
    ↓
Gemini Live            intelligence_delegate — the only tool it has
    ↓                  accepted immediately, no result
Delegation Broker      mints the execution, owns limits and cancellation
    ↓
Intelligence Core      a separately configured text model
    ↓
Tool System → Memory Core   memory_search, memory_view — bounded, read-only
    ↓ delegation.result.v1
Delivery Scheduler     interrupt / when_idle / silent
    ↓
the same voice session labelled source=delegation, never a user transcript
```

Verified on hardware with Gemini Live 3.1 voice and a `gemini-3.5-flash-lite` delegation model:

- the acknowledgement is immediate and carries no answer;
- the user keeps talking while delegation runs, and a follow-up question is answered mid-flight;
- the result returns to the same conversation through native context injection, with no degraded fallback;
- `when_idle` waits for the assistant to stop speaking before delivering;
- the spoken detail matched the stored memory record exactly;
- end-to-end delegation latency is about 2 seconds.

The boundaries hold. The voice model receives only the delegation tool. The delegated model never
receives it and so cannot recurse. Every downstream call passes through Tool System, and memory
bounds are enforced inside Memory Core rather than trusted to a declaration a model can read.
