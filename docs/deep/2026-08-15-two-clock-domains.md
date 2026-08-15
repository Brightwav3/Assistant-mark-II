# Two clock domains: where software echo cancellation runs out of road

*A snapshot of what `aec-system` knew on 2026-08-15. Numbers here were measured on
one development machine against a simulated echo path; the shape holds, the
magnitudes will differ in your room.*

---

## The problem, stated honestly

You are building a voice assistant. It speaks through a speaker. It listens
through a microphone. The microphone hears the speaker.

If you do nothing, the assistant transcribes its own voice, decides the user
interrupted, and stops mid-sentence. It does this constantly, it sounds like a
fault in the model rather than in the audio path, and no component reports
anything wrong — the pipeline is working exactly as built.

The fix is acoustic echo cancellation: subtract what you played from what you
heard. Every textbook covers it. Implementations are readily available. It is,
apparently, a solved problem.

It is solved. What is not obvious from the textbooks is *which* problem is solved,
and that the remaining one is not the one you will spend your first week on.

## What we thought the problem was

The first suspicion is always latency, and on Bluetooth it looks conclusive.

A wired speaker returns its echo 20–40 ms after playback, stable enough to treat
as a constant. Bluetooth is 150–300 ms, and it *moves* — with link load, with
retransmissions, with whatever else is on the 2.4 GHz band. Align a filter to
230 ms and by the next sentence the echo is at 260 ms and the filter is
subtracting silence from the wrong place.

So: measure the delay continuously instead of once, and track it. That is
correct, and we built it, and it is not enough.

The second suspicion is the codec. A low-latency Bluetooth codec genuinely does
reduce the magnitude of the delay. This is useful and it does not help, and the
reason it does not help took a milestone to establish rather than assert.

## What the problem actually is

**The microphone and the speaker have independent clocks.**

The microphone samples at its own nominal 16 kHz. The speaker plays at its own
nominal rate. Neither crystal is exact — ordinary consumer parts differ by tens of
parts per million. Over a minute, the two streams slide apart by several samples.
Over ten minutes, by hundreds.

This is not a Bluetooth property. It holds for **any** setup where capture and
playback are separate devices, wired or wireless. Bluetooth adds a second,
independent problem on top — the offset *jumps* as well as drifting — but remove
Bluetooth entirely and the drift remains.

An adaptive filter models the echo path as a set of taps, each one weighting a
particular delay. Drift does not move the echo from one tap to another, where the
filter could follow it. It smears the echo continuously across taps, at a rate the
filter's adaptation cannot match, forever.

### What it costs, measured

Milestone 3 was asked to produce a number rather than an expectation. Twenty
seconds of synthetic speech through the same simulated echo path, run twice: once
with both clocks identical, once with the playback clock fast by an ordinary
crystal mismatch.

| Clock mismatch | Drift over 20 s | ERLE, final 3 s |
| --- | --- | --- |
| 0 ppm | 0 samples | **58 dB** |
| 50 ppm | 16 samples | **12 dB** |
| 200 ppm | 64 samples | 7 dB |
| 1000 ppm | 320 samples | 3 dB |

Fifty parts per million is not a bad part. It is a normal one. Sixteen samples of
drift over twenty seconds — a millisecond — takes 58 dB of cancellation down to
12.

This is reproduced by a test in the repository rather than only written down. A
measured claim that is not asserted somewhere stops being true silently, usually
about four months later when someone changes a constant.

### Three things that follow, each of which was proposed and rejected once

**A different Bluetooth adapter does not help.** It changes the codec. A
low-latency codec reduces the delay's magnitude, which is worth having and is not
the issue. It does not change the number of clocks. Two independent oscillators
remain two independent oscillators.

**Continuous re-estimation is not an optimisation, and it is also not the fix.**
Measuring the delay once at startup gives you a canceller that works for the first
minute and degrades after — so the estimator must run for the life of the session.
But re-estimating does not recover the lost cancellation either, because the path
is smearing continuously rather than jumping. You are correcting the wrong
quantity.

**One device that both captures and plays removes drift entirely.** A headset or a
conference speakerphone shares a single clock domain. There is nothing to drift.
It sits in the 0 ppm row.

That last one deserves to be said plainly, because it is the conclusion nobody
wants after writing a filter: *the distinction that matters is not wired versus
wireless, it is one clock domain versus two.* A conference speakerphone with
hardware echo cancellation removes the need for this runtime altogether on that
device. Worth knowing before anyone spends a week here on a use case a cable would
have solved.

`aec-system` exists for the case where the host cannot dictate the hardware:
arbitrary microphone, arbitrary speaker, two clocks.

### What actually closes the gap

Compensating drift by **resampling the reference against the capture clock** —
estimating the *rate ratio*, not just the offset. This is what WebRTC AEC3 and
speexdsp do, and it is the reason those libraries are more than a filter with a
delay estimate in front of it.

Implementing it yourself is solving a solved problem in a repository whose value is
the integration rather than the algorithm. That decision is documented as open,
with the evidence attached, rather than made quietly in either direction.

## The shape that survived

The runtime receives two streams and owns only the relationship between them:

```
played PCM  ──► pushReference(frame) ─┐
                                      ├─► EchoProcessor ──► cleaned capture frame
captured PCM ──► process(frame) ──────┘
```

### The host supplies both streams

The alternative is for the canceller to reach for the playback stream itself. That
means a way to tap the speaker on Windows, another on Linux, another per audio
backend — a platform dependency inside the component doing the signal processing.

Having the host push both is nearly free where it matters: the assistant runtime
already holds both halves. Microphone frames arrive through its activation
listener; played PCM passes through its playback controller. The integration costs
it two calls and costs every other repository nothing.

**The reference must be pushed as it is played, not ahead of it.** A host that
queues a whole utterance in advance tells the canceller that playback started
earlier than it did.

### Alignment is internal

The tempting alternative is to have the host pass time-aligned pairs. That moves
the hardest part of the problem to every consumer, and none of them has better
information about the audio path than the runtime does.

## Two processors, because neither is better

`GateEchoProcessor` and `AdaptiveEchoProcessor` sit behind one interface because
they are the same decision at different costs.

**The gate** attenuates capture while the reference is active, plus a tail. It
cannot cancel echo — it refuses to forward it. That costs the ability to interrupt
by voice, which is a real loss. In exchange it needs no delay estimate, no
convergence, and no native dependency, and it works on the first frame. It is the
honest first answer.

**The adaptive filter** estimates the echo path with normalised least-mean-squares
and subtracts it, preserving full duplex. It needs a delay estimate, converges over
time rather than immediately, and degrades when the path changes faster than it
adapts — which is exactly what drift does.

The gate trades a feature for certainty. The filter trades certainty for a feature.
Which is right depends on hardware the repository cannot see, so `capabilities()`
reports **both** regardless of which is configured, and `selected` says which is
running. A host deciding whether to fall back has to see what the fallback costs
before committing to it.

### Three gate decisions worth stealing

**Digital silence must not hold the gate closed.** A host pushing a continuous
reference stream is pushing silence between utterances. Treat any reference frame
as playback and you gate the entire session — the user is never heard, and the
symptom is an assistant that appears deaf rather than one with a threshold bug.

**A frame overlapping the suppression window is suppressed whole.** Attenuating
part of a frame puts a step edge inside it, and a step edge is a click. A click is
precisely the transient a provider's voice activity detector fires on — you have
built a suppressor that generates the event it exists to prevent.

**The tail is not a refinement.** When the last reference frame arrives, that audio
has not reached the speaker yet, let alone the microphone. The default 400 ms
covers the 150–300 ms Bluetooth range plus room decay.

### Two adaptive failure modes that decide real-world usefulness

**Divergence.** A diverged filter makes the output *worse* than the input. It must
detect that and fall back to passing capture through unchanged. Emitting garbage is
worse than emitting echo.

**Double-talk.** When the user and the assistant speak at once, adapting on that
audio corrupts the echo-path estimate — the filter tries to model the user's voice
as part of the echo. Adaptation must **freeze** during double-talk instead of
learning from it.

This is the usual reason a textbook implementation performs beautifully on
synthetic tests and badly in a conversation. Synthetic tests rarely include
double-talk. Conversations are mostly double-talk.

## Delay estimation, and two bugs that became decisions

### Envelopes propose, waveforms decide

Estimation runs in two stages. Amplitude envelopes are correlated across the whole
search window, cheaply, to propose candidates. Each candidate is then tested on the
waveform at sample resolution, and *that* test decides.

The second stage is not an optimisation. Two unrelated speech signals share a
syllabic rhythm, and in this repository's own test data their envelopes correlate
at **0.49** — confidently, plausibly wrong. Waveform correlation separates a real
echo from a coincidence, because echo is a scaled copy of the reference and
unrelated audio is not.

### A moved delay shifts the filter; it never clears it

Keep the delay the filter is *aligned to* separate from the *last estimate*. Two
consequences, both of which were bugs before they were decisions:

**A failed estimation attempt does not stop cancellation.** If the reference goes
quiet the estimator cannot measure anything. The filter keeps using the last delay
that converged, because the loudspeaker has not moved.

**A moved estimate shifts the weight vector rather than clearing it.** Re-anchoring
the filter and starting again was measured collapsing **73 dB of cancellation to
5 dB**, mid-session, every time the estimate moved by a single sample. Shifting the
weights by the same amount as the delay keeps every tap pointing at the reference
sample it was trained on. Only a jump larger than the filter itself clears it,
because then nothing learned still applies.

### A reference can be retracted

A host does not always play what it queued. Barge-in kills the player mid-utterance
and the buffered audio is discarded — it existed as a plan, never as sound.

Without a way to take it back, the filter subtracts an echo that never arrives, and
the gate suppresses for the full duration of speech the user interrupted precisely
because they did not want to hear it. Either way the assistant is deafened to the
person who just interrupted it — the exact failure the repository exists to remove.

So `dropReferenceFrom(timestampMs)` lives on the processor contract rather than
being a gate detail. The adaptive processor truncates its reference timeline and
**keeps its weights** (the loudspeaker has not moved, only the audio it was about
to play has gone). The gate ends the current suppression window but **keeps the
tail** over what was already played, because that sound is still travelling.

This was found by integrating, not by reasoning. The contract had been declared
feature-complete the day before.

## Honesty as an architectural property

**An echo canceller that is not working sounds exactly like an echo canceller that
is not needed.** That single sentence drives everything below.

### Degrade by passing through

Three states have nothing to cancel: no reference has ever been pushed, the delay
has not converged, and divergence protection just fired. None is a host mistake — a
user speaking before the assistant has played anything is the normal case.

So the runtime returns the capture unmodified and *reports which state it is in*.
Errors are reserved for things the host got wrong: a malformed frame, an
irreconcilable format, a call before `start()`. Erroring on a normal state would
make every host implement the same fallback.

### Metrics are part of the contract

Without measurement a host cannot distinguish "no echo present" from "cancellation
failed", and both produce silence in a metrics-free design. Every processor reports
estimated delay, ERLE, convergence state, and frames processed, so a host can
degrade *deliberately* rather than trusting that it worked.

### Under-reporting is as bad as over-reporting

ERLE is measured only on blocks carrying real level. A near-silent block has a
residual dominated by quantisation, and averaging those in reported a working
canceller at **17 dB while it was actually achieving 58 dB**.

A metric that under-reports costs you full duplex for no reason: the host falls
back to the gate, correctly following a number that was wrong.

### The CLI reports attenuation, deliberately not ERLE

Offline, the tool reports *attenuation* — the ratio between supplied capture and
produced output. That counts near-end speech the gate suppressed as though it were
echo removed. Calling it ERLE would rank the gate, which cancels nothing, as the
best canceller in the repository.

A trailing partial frame is dropped rather than zero-padded, for the same reason:
padded silence reads as cancellation that did not happen.

### Reconcile only where you know better than the host

The assistant plays at 24 kHz and captures at 16 kHz. The reference is resampled
onto the capture clock by linear interpolation, whose error is far below the echo
path's own variability. Rejecting the mismatch would push a resampler into every
host, and the host has no better information than the runtime does.

Channel count and sample encoding are **not** reconciled. Stereo or a different
encoding is a structured error, because silently mixing down would hide a real
integration mistake.

### Tests simulate echo instead of mocking it

A test that asserts `process()` was called proves nothing about cancellation. The
tests build a known echo path — delay a reference signal, attenuate it, mix it into
synthetic near-end speech — and assert measured ERLE above a threshold.

That makes the test suite a specification of the actual capability, and keeps it
hardware-free: no microphone, no speaker, no network, no key.

## Why this is TypeScript, and why that is not the interesting question

The ecosystem is TypeScript on Node 22, and consistency across repositories is
worth more than a local optimisation. The rule is that a native component needs
**measured evidence, not an expectation**.

Two justifications were available. Only one survived measurement.

**Speed does not justify it.** The filter runs at **0.028× realtime** — 220 ms of
compute for 8 s of 16 kHz audio at 1024 taps. Arithmetic throughput is not the
constraint, and the usual argument for going native is simply false here.

**Accuracy does.** Clock drift, per the table above. What closes it is drift
compensation, which WebRTC AEC3 and speexdsp already implement.

A native backend sits behind the same `EchoProcessor` interface, so the decision
changes one implementation and no consumer. That is why the interface was worth
having before the decision existed.

## If you are building this yourself

In the order that saves the most time:

1. **Find out how many clock domains you have.** If you can dictate the hardware,
   a headset or a conference speakerphone ends the project. Do this before writing
   a filter.
2. **Put the reference on the contract from the start.** Retraction included.
   Adding `dropReferenceFrom` after the fact means revisiting every consumer.
3. **Build the gate first.** It works on the first frame, needs nothing, and gives
   you a baseline against which the filter's benefit is visible. It also gives your
   host something to fall back to.
4. **Report metrics before you need them.** You cannot tell "no echo" from "failed"
   without them, and that is the first question you will ask.
5. **Measure ERLE only on blocks with real level.** Otherwise your own metric will
   send you back to the gate.
6. **Simulate the echo path in tests.** Mocking the call proves nothing.
7. **Correlate waveforms, not envelopes, to decide the delay.** Envelopes are for
   proposing candidates.
8. **Shift the filter when the delay moves. Never clear it.**
9. **Freeze adaptation during double-talk.** This is the difference between a
   demo and a conversation.
10. **Assume you will need drift compensation, and plan to get it from a library.**

## Where the reasoning lives

This document is a narrative. The decisions it describes are recorded, one per
boundary, in `aec-system/docs/decisions/`:

| | |
| --- | --- |
| [0001](../../aec-system/docs/decisions/0001-host-supplies-both-streams.md) | The host supplies both streams |
| [0002](../../aec-system/docs/decisions/0002-two-clocks-and-what-drift-costs.md) | Two clock domains, and what drift costs |
| [0003](../../aec-system/docs/decisions/0003-two-processors-one-interface.md) | Two processors behind one interface |
| [0004](../../aec-system/docs/decisions/0004-delay-shifts-the-filter-and-references-can-be-retracted.md) | A moved delay shifts the filter |
| [0005](../../aec-system/docs/decisions/0005-typescript-until-evidence-says-otherwise.md) | TypeScript until evidence says otherwise |
| [0006](../../aec-system/docs/decisions/0006-honest-degradation-and-honest-metrics.md) | Honest degradation, honest metrics |

Known limits, including the open native-backend decision, are in
[`aec-system/ISSUES.md`](../../aec-system/ISSUES.md).
