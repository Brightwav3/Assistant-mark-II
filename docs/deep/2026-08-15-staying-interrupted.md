# Staying interrupted

*A snapshot of how M.A.R.K. II handled superseded asynchronous work on
2026-08-15. The pattern is not audio-specific.*

---

## A bug you cannot reproduce on purpose

The user interrupts the assistant. The assistant stops. Three hundred milliseconds
later it says one more syllable.

Or: the user barges in mid-sentence, and the transcript that arrives is of what
they were saying *before* they barged in.

Or: a model execution is cancelled and superseded, and the old one's answer
overwrites the new one because it finished second.

These look like three bugs in three subsystems. They are one bug, and the reason it
is hard to reproduce deliberately is that it depends on a race you cannot easily
lose on demand.

## Cancellation does not do what its name suggests

The instinct is that cancellation handles this. It does not, and the gap is
structural rather than a matter of implementation quality.

**Cancellation stops work from starting. It cannot recall work that has already
left.**

At the moment you cancel:

- a network read has already been issued and its response is in flight;
- a child process has already buffered output it will flush regardless;
- a callback is already scheduled on a queue you do not control;
- a provider has already committed to sending you the next audio packet.

Every one of those arrives *after* the cancel, carrying a correct answer to a
question that has been withdrawn. Nothing about the arriving data says it is stale.
It is well-formed, it is on the right channel, and the only thing wrong with it is
that the world moved on.

## The pattern: authority generations

Every asynchronous turn carries a **monotonically increasing generation number**.

Cancellation, barge-in, interruption, or supersession advances it. A result is
delivered only if it belongs to the current generation. Anything older is dropped.

Three details make the difference between this working and being a rediscovered
version of the same bug.

### The check goes at the last boundary before the effect

Not where the work started. The work *was* authorised when it started — that is not
the question. The question is whether it is still authorised now that it is about
to have an effect, and only the boundary immediately before the effect can answer
it.

Concretely: for audio, the check belongs at the **output adapter**, not at the
point synthesis was requested. By the time a packet reaches the adapter, it has
already escaped the cancellation. That is precisely the case the pattern exists
for.

### Drop silently

A superseded result is normal operation, not an anomaly. Logging each one fills the
log during exactly the interactions that are hardest to read — rapid barge-in,
double-talk, a user who changes their mind mid-sentence.

Count them in a metric. Do not narrate them.

### Generation is not identity

They are separate and conflating them is easy. Identity says *which thing this is*.
Generation says *which era it belongs to*. A retry is new work under the current
generation, not a revived old one — so a retry keeps the request identity and takes
the current generation.

## Four independent implementations, one rule

The strongest evidence that this belongs to the architecture rather than to a
subsystem is that four parts of the system arrived at it separately, before anyone
wrote it down as a rule.

| Component | Its expression of the rule |
| --- | --- |
| **Scribe Core** (speech input) | Every async turn carries stable session, utterance, and response ids plus a generation. Cancellation or barge-in advances it; late STT, TTS, and playback completions are ignored. |
| **Voice Core** (speech output) | Each request carries an abort controller. An aborted request **loses authority before a late provider result is forwarded to an output adapter**. |
| **Realtime Core** (native audio sessions) | Interruption advances output authority. The **adapter** drops chunks belonging to an older generation, so late provider packets cannot resume playback. |
| **Assistant Runtime** (composition) | Delegation delivery is keyed to `logicalSessionId`, so a superseded physical session cannot claim a queued result. |
| **Intelligence Core** (model execution) | Request identity and execution identity are distinct, so a result names the attempt it came from and a stale one is recognisable. |

Five, counting Intelligence Core, which solves the same problem with a different
mechanism — separate identities rather than a counter — because there the question
is *which attempt is this* rather than *is this era current*.

They had begun to diverge in naming while agreeing in substance. Writing the rule
down was not about changing any of them; it was about stopping a sixth component
inventing a sixth variant.

## What was rejected, and why

### "Cancellation is enough"

Covered above. It stops starts, not arrivals. On a provider that does not honour
cancellation at all — which you will meet — it does nothing whatsoever, and the
generation check still holds.

### "Discard results older than N milliseconds"

Replaces a fact with a guess. A slow-but-current result gets discarded; a
fast-but-superseded one gets delivered. And the threshold has to be re-tuned for
every provider and every host, forever.

The generation is *known*. Timestamps are inference about the generation.

### "Check authority when the work starts"

Answers the wrong question, as above.

### "Surface every dropped result so nothing is lost silently"

Sounds responsible. In practice a drop is normal, and treating it as an anomaly
buries the real anomalies. Metrics yes; per-drop diagnostics no.

### "Let each core solve it its own way"

This is what happened, and it worked — the point of writing the rule was that the
next component would not have to rediscover it, and that the five existing ones
would not drift apart in vocabulary while agreeing in substance.

## What it costs

**Every async boundary threads a generation through**, including cheap ones whose
results nobody would notice.

**A drop is invisible without a metric.** A bug that advances the generation too
eagerly presents as silence — the assistant simply stops answering, with no error
anywhere. This is the failure mode to watch for, and the metric is what makes it
visible.

**Generation and identity are easy to confuse**, particularly in logs where both
are integers.

## This is not about audio

The examples are audio because that is where the symptom is loudest — a resumed
syllable after an interruption is immediately, viscerally wrong in a way a stale
API response is not.

But the shape appears anywhere work outlives the request that authorised it:

- A search-as-you-type box where an early query returns last.
- A UI that renders a response for a route the user has already left.
- A job queue where a retry and its original both complete.
- Any streaming response the user can cancel.

The web frontend version of this is usually solved with an abort controller and an
`if (signal.aborted) return` at the end — which is the same pattern, expressed for
a case with only two generations.

## If you are building this yourself

1. **Assume cancellation does not recall in-flight work.** Design for the arrival,
   not the cancel.
2. **Put the generation check at the last boundary before the effect.** Anywhere
   earlier is a check on a question already answered.
3. **Advance on every supersession event**, not just explicit cancellation —
   barge-in, handoff, replacement, and timeout all count.
4. **Drop silently, count in a metric.** Then watch the metric, because a
   too-eager generation looks exactly like a working system that says nothing.
5. **Keep generation separate from identity.** A retry is new work in the current
   era.
6. **Write the rule down once several components have it.** Before that you are
   guessing at the shape; after that you are preventing the seventh variant.

## Where the reasoning lives

| | |
| --- | --- |
| [Ecosystem ADR 0002](../decisions/0002-authority-generation.md) | The rule, its rejected alternatives, and each component's expression of it |
| [`INVARIANTS.md`](../../INVARIANTS.md) | `INV-004`, the testable sentence |
| [intelligence-core ADR 0003](../../intelligence-core/docs/decisions/0003-request-vs-execution.md) | Request versus execution identity |
| [voice core ADR 0002](../../speech-system/voice%20core/docs/decisions/0002-request-and-playback-identity.md) | The same split for speech output |
| [assistant-runtime ADR 0002](../../assistant-runtime/docs/decisions/0002-delegated-results-are-never-the-user.md) | Why delivery binds to the logical session |
