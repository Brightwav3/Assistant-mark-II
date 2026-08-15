# Why a voice assistant needs two models

*A snapshot of how M.A.R.K. II's delegation path worked on 2026-08-15.*

---

## The four seconds nobody designs for

A realtime voice model is very good at holding a conversation and not especially
good at anything else. It responds in a few hundred milliseconds, it handles
interruption, it sounds like a person. Ask it to search your memory, reason over
what it finds, and come back with an answer, and one of two things happens.

Either you wait — and four seconds of silence in a spoken conversation is not a
pause, it is a fault. The user says "hello?" and starts again.

Or the model fills the silence. This is the interesting failure, because it does
not look like a failure. The model has been asked a question, it has nothing to
answer with, and generating plausible text is precisely what it does. So it
answers. Confidently. About a memory it never retrieved.

You cannot prompt your way out of this. "Do not make things up" competes against
the entire shape of the thing. What you can do is remove the silence, so there is
nothing to fill.

## The move: two models and a broker

Split the job.

**The voice model holds the turn.** It converses, it acknowledges, it handles
barge-in. It is chosen for latency and prosody.

**A delegated model does the work.** It searches, reasons, uses tools, takes as
long as it takes. It is chosen for capability.

**A broker sits between them and owns the authority.**

The critical property is the order of operations. When the voice model requests
delegation, the broker **mints an execution identity and hands it back before any
work begins**. The voice model receives something real, immediately — an
acknowledgement it can speak and an id it can correlate against later.

From `assistant-runtime/src/delegation/broker.ts`:

> It exists so that "I'll look into that" can be true the moment it is said. The
> broker mints an execution identity, hands it back, and only then lets
> Intelligence Core start work — so the voice model has something real to
> acknowledge and correlate against, and never has to invent a result to fill the
> gap.

"I'll look into that" is not a stalling phrase. It is a true statement about a
thing that has a name.

### The acknowledgement is instruction, not script

The broker hands the voice model an instruction, not a sentence to read:

> Background work has started. Acknowledge briefly and naturally that you are
> looking into it, then continue the conversation. Do not state or invent a result;
> it will arrive separately as a delegation result.

The runtime never speaks verbatim. The text is configurable and localisable,
because a fixed English sentence is the first thing that breaks when the assistant
is used in another language — and because a model reading a canned line sounds like
a model reading a canned line.

### Authority stays with the runtime

The voice model *requests*. The broker *decides*: model selection, limits,
deadlines, cancellation, and delivery policy.

This matters more than it looks. The voice model's input includes whatever the user
said, and — once tools are involved — content from web pages and documents. A model
whose requests carry their own authority is a model that can be instructed by the
material it reads.

## Where a capability lives, and why it is not obvious

Once you have two paths, every new capability needs to be routed. This ecosystem
got it wrong once, in an instructive way.

New memory tools — search memory, create a memory, recall the current conversation
— appeared in `assistant-runtime/src/delegation/` rather than in `host-tools`,
where the tool catalogue lives. It looked like a mistake. Someone had bypassed the
tool system.

It was not a mistake. Asked why, the agent that made the choice gave a good answer:
a delegated capability runs asynchronously, and while it runs the voice model has
both the time and the incentive to invent a result. Routing it through the broker
removes the opening. A host tool answers within a second and offers no such gap.

That reasoning was also already written down — in the broker's file header. And it
was still unavailable to the next agent, because the header answers *what does this
broker do* and nobody creating a tool file opens the broker.

The rule that came out of it:

> **Can this capability produce its answer inside the turn that requested it?**

Yes → declare it in the tool catalogue, execute it through the tool system.
No → route it through the broker.

### The boundary case that proves the rule

`screen_capture` takes seconds. It is still a host tool.

It returns a `continuation` — an immediate acknowledgement plus an id — and the
*runtime* owns the wait. The acknowledgement is synchronous even though the image
is not. Nothing is left for the model to fill.

The dividing line is not "how long does the work take". It is "does the model
holding the turn face a gap".

### Domain is the wrong criterion

The instinct is to route by subject: memory tools live with memory, host tools with
the host. It is the first thing you reach for and it produces the wrong answer,
because it says nothing about who holds the turn. A fast memory lookup and a slow
web search would land in different homes under a domain rule, while having
identical latency behaviour — which is the property that actually governs
correctness.

## Getting the answer back

The delegated result finishes after the turn that requested it has ended. It has to
re-enter a live conversation, and the only channel a realtime session offers is the
one carrying conversation content.

The path of least resistance is to inject it as a user turn. It works immediately.
The model sees text, responds to it, the answer reaches the user.

It also destroys the distinction between what the user said and what the runtime
found — in the live session, in the episode record, and in every trace afterwards.
A later extraction pass reading that episode will attribute the runtime's findings
to the user as things they said. That corruption is permanent and silent.

Injecting as an *assistant* turn is better attribution and still wrong: it asserts
the assistant already said something it did not say, and the model then treats
fabricated history as its own prior commitment.

**So a delegated result travels as a context event with `source: "delegation"`.**
The voice model can tell the difference. So can every trace, and so can the episode
record.

### Timing is a declared policy

A result that arrives mid-sentence and interrupts is right for an urgent answer and
wrong for a background lookup. The correct choice is not a property of the result,
so it is not inferred:

| Policy | Behaviour |
| --- | --- |
| `interrupt` | Cuts the current answer off |
| `when_idle` | Waits for a gap |
| `silent` | Never speaks; recorded, not delivered |

`silent` is more useful than it sounds. A capability can enrich state or memory
without saying anything, which is most of what an assistant should be doing in the
background.

### Bind to the logical session, not the physical one

Delivery is keyed to `logicalSessionId`.

A long conversation outlives its context window, so the runtime performs handoffs:
compact the transcript, open a fresh provider session, cut over. The **physical**
session id changes at every commit. Every delegation queued against it would be
stranded at exactly the moment the session was replaced.

This is the worst failure shape available — it works perfectly in testing, where no
handoff occurs, and loses results in long conversations, where they matter most.

## Two rules that fall out of the same principle

### The model never names a session

`conversation_recall` reads the turns of the conversation currently happening. Its
session scope is supplied by the runtime and never by the model.

A model that could name a session id could read another conversation. The parameter
is bound in the declaration rather than passed by the caller, so the constraint is
visible in the contract instead of enforced by convention.

### A tool result is evidence, not instruction

What comes back from a tool is what somebody said, or what some web page contained.
It is tainted accordingly. Untrusted content and privileged capability must not
share one undifferentiated channel.

This is the same principle as the acknowledgement instruction and the session
binding: **the model is a component that produces input to decisions, never the
authority that makes them.**

## What it costs

Two models cost more than one, in latency at the boundary, in tokens, and in
complexity. The honest accounting:

**You now have two identities to track** — logical and physical sessions — and
confusing them produces bugs that only appear in long conversations.

**A `silent` result is invisible** unless something reads the trace.

**Consumers must handle a context event source** they would otherwise ignore.

**The delegated model's cost is real** and is spent on requests the user may not
have consciously asked for.

Against that: the assistant stops inventing answers. Not "less often" — the
opportunity is removed, because there is no gap in which to invent one.

## If you are building this yourself

1. **Decide what holds the turn**, and make it the only thing that does.
2. **Mint the identity before starting work.** Not after. The whole property
   depends on the acknowledgement being about something that already exists.
3. **Make the acknowledgement an instruction, not a script.** Canned lines sound
   canned and do not survive translation.
4. **Route by "can it answer within the turn"**, not by subject.
5. **Never re-inject a background result as user speech.** Give it its own source.
   You will not get this back once the episode records are written.
6. **Bind delivery to a logical session id from day one.** Retrofitting it after
   the first handoff means auditing every queued path.
7. **Make delivery timing an explicit policy** with an inert option.
8. **Keep session scope out of the model's hands.**

## Where the reasoning lives

| | |
| --- | --- |
| [Ecosystem ADR 0001](../decisions/0001-capability-homes.md) | Which home a capability belongs in |
| [assistant-runtime ADR 0002](../../assistant-runtime/docs/decisions/0002-delegated-results-are-never-the-user.md) | Delivery, attribution, and the logical-session binding |
| [assistant-runtime ADR 0001](../../assistant-runtime/docs/decisions/0001-zero-imports-between-cores.md) | Why the cores that meet here do not import each other |
| [intelligence-core ADR 0005](../../intelligence-core/docs/decisions/0005-model-output-is-input-never-authority.md) | Model output is input to a decision, never the decision |
| [`INVARIANTS.md`](../../INVARIANTS.md) | `INV-001` and `INV-002`, the routing rule as a testable sentence |

Known limits are in [`assistant-runtime/ISSUES.md`](../../assistant-runtime/ISSUES.md)
— notably that the modular speech path is not yet hardware-verified.
