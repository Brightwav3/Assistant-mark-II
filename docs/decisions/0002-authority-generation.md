# ADR 0002: A late result from a superseded attempt is dropped, not delivered

- **Status:** Accepted
- **Date:** 2026-08-15
- **Decision owners:** M.A.R.K. II architecture
- **Scope:** `speech-system` (scribe core, voice core, realtime core),
  `assistant-runtime`, `intelligence-core`

## Context

Every asynchronous path in this system has the same failure available to it. Work
starts, the user interrupts, new work starts — and then the first piece of work
finishes and delivers its result.

The result is not wrong. It is an accurate answer to a question that has been
withdrawn. Delivered anyway, it produces the behaviours that make an assistant
feel broken and that are almost impossible to reproduce deliberately:

- A cancelled sentence resumes speaking several hundred milliseconds after the
  user interrupted, because a late provider packet arrived at the output adapter.
- A transcript from before a barge-in is submitted as though it were the user's
  current utterance.
- A superseded model execution's answer overwrites the current one.

Cancellation alone does not prevent this. A cancelled operation still has work in
flight — a network read that has already been issued, a child process with buffered
output, a callback already scheduled. The signal stops new work; it cannot recall
work that has left.

Three repositories arrived at the same solution independently, which is the
strongest evidence available that it belongs to the ecosystem rather than to any
one of them.

## Decision

**Every asynchronous turn carries a monotonically increasing authority
generation.** Cancellation, barge-in, interruption, or supersession advances it.

**A result is delivered only if it belongs to the current generation.** Anything
older is dropped silently at the boundary it arrives at — not logged as an error,
because it is not one, and not forwarded with a warning, because the consumer has
no useful response to it.

**The check happens at the last boundary before the effect**, not at the point
work is started. Dropping at the adapter is what makes it correct: the whole point
is that the work already escaped the cancellation.

Current expressions of the rule:

| Repository | Mechanism |
| --- | --- |
| `scribe core` | Session/utterance/response ids plus a generation; late STT, TTS, and playback completions are ignored |
| `voice core` | An aborted request loses authority before a late provider result reaches an output adapter |
| `realtime core` | Interruption advances output authority; the adapter drops chunks from an older generation so late packets cannot resume playback |
| `assistant-runtime` | Delegation delivery is keyed to `logicalSessionId`, so a superseded physical session cannot claim a queued result |
| `intelligence-core` | Request and execution identity are distinct, so a result names the attempt it came from |

## Rejected alternatives

### Rely on cancellation alone

Rejected. Cancellation stops work from starting. It cannot recall a network read
already issued or a child process's buffered output, and those are exactly the
cases that produce the audible failure.

### Check authority when the work starts

Rejected. The work was authorized when it started. The question is whether it is
still authorized when it finishes, and only the finishing boundary can answer it.

### Use timestamps and discard results older than a threshold

Rejected. It replaces a fact with a guess. A slow-but-current result is discarded
and a fast-but-superseded one is delivered, and the threshold has to be re-tuned
for every provider and every host.

### Log or surface dropped results so nothing is lost silently

Rejected as a default. A dropped superseded result is normal operation, not an
anomaly, and treating it as one fills the log with noise during exactly the
interactions that are hardest to read. Metrics counting drops are acceptable;
per-drop diagnostics are not.

### Let each core solve it its own way

Rejected — this ADR exists because three already did, and the shapes had begun to
diverge in naming while agreeing in substance. One stated rule keeps a fourth
component from inventing a fifth variant.

## Consequences

### Positive

- An interrupted assistant stays interrupted.
- The guarantee holds even when the underlying provider does not honour
  cancellation.
- A new asynchronous path has a rule to follow rather than a failure to rediscover.

### Costs

- Every async boundary must thread a generation through, including ones whose
  results are cheap.
- A dropped result is invisible without a metric, so a bug that advances the
  generation too eagerly presents as silence.
- Generation and identity are separate concepts that are easy to conflate.

## Enforced in

- `speech-system/realtime core/src/runtime.ts`
- `assistant-runtime/src/delegation/delivery.ts`

## Explicit non-decisions

This ADR does not define how a generation is represented, does not decide what
advances it in any specific core, does not require a shared implementation or
package, and does not govern retry — a retry is new work under the current
generation, not a revived old one.
