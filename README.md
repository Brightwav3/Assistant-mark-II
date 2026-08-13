# Merely A Responsive Kernel II

[![Integration](https://github.com/Brightwav3/Assistant-mark-II/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Brightwav3/Assistant-mark-II/actions/workflows/ci.yml)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm%20Noncommercial-4c1d91)](https://polyformproject.org/licenses/noncommercial/1.0.0/)
[![Architecture: git submodules](https://img.shields.io/badge/Architecture-git%20submodules-6f42c1)](https://git-scm.com/book/en/v2/Git-Tools-Submodules)

Infrastructure for an intelligent, capable, model-independent personal assistant.

M.A.R.K. II is a new generation of the assistant, continuing from the completed
M.A.R.K. I proof of concept.

M.A.R.K. is not a chatbot, a voice model, a desktop application, or a single AI
provider. It is the persistent platform around those components: the kernel that
responds to the user, its environment, its current state, and its capabilities.

This repository is the active development line after the completed
[Assistant M.A.R.K. I](https://github.com/Brightwav3/Assistant-mark-I) proof of
concept.

---

## The M.A.R.K. progression

The Marks describe technological evolution, not just repository versions.

```text
M.A.R.K. I
Proof of Concept
        │
        ▼
M.A.R.K. II
Intelligent Half-Duplex Assistant
        │
        ▼
M.A.R.K. III
Future Conversational Assistant
```

### M.A.R.K. I — Proof of Concept

M.A.R.K. I asked:

> Can a long-term personal assistant exist as a modular system independent of
> any particular AI model?

M.A.R.K. I answered:

> Yes.

It proved that independent cores can be composed into one usable system:

```text
Activation
    ↓
Assistant Runtime
    ↓
Speech / Realtime
    ↓
Intelligence
    ↓
Memory + State
    ↓
Tools
```

The proof included independent repositories, a composition runtime, native
realtime audio, spoken interaction, interruption and barge-in, persistent
conversation summaries, memory and state integration, bounded tool execution,
and deterministic safety boundaries.

M.A.R.K. I did not need to be elegant, maximally natural, or broadly useful
every day. Its product was architectural proof.

### M.A.R.K. II — Intelligent Half-Duplex Assistant

M.A.R.K. II asks:

> How capable can an assistant become with the current generation of
> half-duplex voice models?

M.A.R.K. II is where the system stops proving that it can work and starts
becoming genuinely capable.

The voice model is the realtime interaction layer of a larger system. It should
be able to recognize when a task needs deeper reasoning, a deterministic tool,
a long-running operation, or another agent, and delegate that work while
continuing to manage the user interaction.

```text
                         Voice Model
                              │
                 ┌────────────┴────────────┐
                 │                         │
            Conversation              Delegation
                                           │
                                  Intelligence Core
                                           │
                         ┌─────────────────┼─────────────────┐
                         │                 │                 │
                       Tools            Reasoner           Agents
```

M.A.R.K. II remains half-duplex. It extracts the maximum useful capability from
the current conversational model paradigm while keeping the platform ready for
a different future.

Its priorities are:

- Voice × Intelligence integration;
- delegation from realtime interaction into deeper reasoning;
- serious but explicitly bounded tools;
- lower perceived latency and better endpointing;
- reliable interruption, cancellation, and recovery;
- improved audio coordination and acoustic echo cancellation;
- state-aware workflows and provider switching;
- full-duplex-ready event and lifecycle contracts.

### M.A.R.K. III — Future

M.A.R.K. III is a future generation, outside the current M.A.R.K. II scope. It
will explore conversational systems that can move beyond alternating turns when
the model technology makes that architecture practical.

M.A.R.K. II only prepares the boundaries for that possibility. It does not
implement M.A.R.K. III prematurely.

---

## The M.A.R.K. II principle

M.A.R.K. II should maximize the capability of half-duplex systems without making
half-duplex behavior a permanent architectural assumption.

```text
capture
  ↓
audio processing
  ↓
realtime interaction
  ├── direct response
  ├── interruption
  ├── delegation
  ├── tool execution
  └── background completion
```

A realtime voice session may remain responsible for immediate interaction while
a delegated operation continues elsewhere. That requires explicit contracts for
interaction identity, task identity, correlation, cancellation, deadlines,
partial progress, late results, session closure, provider failure, and state
publication.

The system must not encode the assumption that:

```text
conversation = one request → one response → one completed operation
```

---

## The full-duplex problem

The native realtime path is intentionally a foundation for full-duplex, not a
full-duplex assistant yet. [full-duplex-attempts](https://github.com/Brightwav3/full-duplex-attempts)
records the experiments, criteria, and limitations behind that distinction.

The inherited M.A.R.K. I composition runs a native bidirectional audio session
through Gemini Live. That solves the media plumbing, but Gemini Live remains a
generation-2, turn-based model: it waits for the user to stop before responding
and cannot backchannel while the user is speaking. This is a model limitation,
not a missing state transition or a silence timer that can be tuned away. True
full-duplex requires a [generation-3 model](https://github.com/Brightwav3/full-duplex-attempts/blob/main/docs/what-full-duplex-requires.md)
that can continuously process both directions and decide when to speak.

M.A.R.K. II still has important application work to do around that model limit:

- **Bounded native realtime tool path.** `RealtimeSessionConfig` declares the
  active safe catalogue and `RealtimeSpeechEvent` carries correlated tool
  requests. Tool System validates arguments, applies policy, executes the Host
  Tools catalogue, and returns the result to the native session. The default
  read-only path is hardware-verified; side-effecting tools such as `open_app`
  remain explicit opt-ins.
- **No shared acoustic signal path.** Scribe Core owns capture and Realtime
  Core owns playback, deliberately as independent repositories. Acoustic echo
  cancellation needs both signals on one timeline, so the current decomposition
  gives AEC nowhere to live while the microphone stays open during playback.

The full-duplex problem is therefore not one missing feature. The model sets the
ceiling; M.A.R.K. II still has to provide delegation, cancellation, recovery,
and an audio boundary that can handle echo. The goal is to solve those internal
gaps now while keeping the provider contract stable, so a future M.A.R.K. III
model can be added without rebuilding the assistant around it.

See [the M.A.R.K. I attempt](https://github.com/Brightwav3/full-duplex-attempts/blob/main/docs/attempts/assistant-mark-i.md)
for the dated criteria and three walls, and the
[full-duplex attempts repository](https://github.com/Brightwav3/full-duplex-attempts)
for the comparison with the cascade attempt.

---

## Platform boundaries

M.A.R.K. II owns the active composition and evolution of the assistant platform.
It manages interaction lifecycle, realtime voice, deeper intelligence,
delegated work, deterministic tools, capability boundaries, cancellation,
recovery, state publication, diagnostics, and provider-independent contracts.

It does not turn one repository into the owner of everything. Individual cores,
provider SDK internals, raw long-term memory policy, device-specific hardware,
model training, graphical applications, unrestricted OS control, and speculative
future infrastructure remain separate responsibilities.

The voice model is an interaction intelligence client of the platform. It is not
the owner of memory, permissions, tools, state, or lifecycle.

---

## Repository structure

This is a meta-repository. The core repositories remain independent Git
repositories linked through pinned submodule commits.

| Component | Responsibility | Baseline status |
| --- | --- | --- |
| [`core-runtime`](./core-runtime) | Lifecycle, configuration, events, component registry, local API, and health | Foundation complete |
| [`activation-core`](./activation-core) | Activation providers and activation events | v0.1 complete |
| [`speech-system`](./speech-system) | Scribe Core, Voice Core, and Realtime Core | Component foundations complete |
| [`intelligence-core`](./intelligence-core) | Model gateway, context, reasoning, and provider boundaries | Core complete |
| [`memory-core`](./memory-core) | Deliberate durable memory and retrieval | v0.1 complete |
| [`state-core`](./state-core) | Current state, freshness, revisions, subscriptions, and snapshots | v0.1 complete |
| [`device-network`](./device-network) | Device protocol, registry, transport, liveness, commands, and events | v0.1 complete |
| [`tool-system`](./tool-system) | Tool contracts, validation, policy, guards, and brokered execution | v0.1 complete |
| [`host-tools`](./host-tools) | Deterministic capabilities exposed to the assistant | v0.1 complete |
| [`assistant-runtime`](./assistant-runtime) | Cross-core composition and interaction orchestration | M.A.R.K. II baseline |
| [`activation-gemini-bridge`](./activation-gemini-bridge) | Historical temporary activation-to-realtime bridge | Retained for lineage |

The cores have zero imports between each other. `assistant-runtime` is the
composition root: it connects public boundaries through typed adapters without
merging the ownership of the cores.

---

## Planned structure

The eleven repositories above are the beginning, not the shape. Below is the
full set of cores the system is planned to consist of, and what each one owns.
Cores are added one at a time — each must produce a real, testable capability
before the next major layer begins.

### Cores

| | Core | What it owns |
| --- | --- | --- |
| ✅ | Brain Core | Lifecycle, component registry, health, the base runtime and orchestration. |
| ✅ | Activation Core | Activation by wake phrase, clap, external trigger, and similar signals. |
| ✅ | Intelligence Core | Model gateway, context, action loop, routing, and model-independent inference. |
| ✅ | Memory Core | Long-term structured memory with provenance, confidence, and update/forget semantics. |
| ✅ | State Core | Current state of the system and the world: devices, active interactions, freshness, TTL, snapshots. |
| ✅ | Scribe Core | Audio and microphone input → STT → transcript. |
| ✅ | Voice Core | Text → TTS → audio playback. |
| ✅ | Realtime Core | Persistent native-audio sessions of the Gemini Live kind, audio ⇄ model. |
| ❌ | Interaction Core | Coordination of conversational flow between the speech subsystems, if it turns out to be needed. |
| ❌ | Event Core | Central cross-system event infrastructure. |
| ❌ | Context Core | Broader environmental and user context across systems. |
| ❌ | Security Core | Authority, permissions, trust boundaries, and policy. |
| ❌ | Task Core | Long-running, persistent work independent of any single conversation. |
| ❌ | Automation Core | Deterministic trigger → conditions → action workflows with no AI involved. |
| ❌ | Presence Core | Where the user is, with confidence and room-level presence. |

### Beyond the cores

| | Component | What it owns |
| --- | --- | --- |
| ✅ | Device Network | Communication with devices and future room satellites. |
| ✅ | Assistant Runtime | Composes every independent core into one running assistant. |
| ✅ | Tool System | The tool contract: declaration, validation, guards, brokered execution, policy enforcement point. |
| ✅ | Host Tools | The capability catalogue: what the assistant can actually do on a machine. |
| ❌ | Display System | Structured visual output. |
| ❌ | Home Bridge | Integration with Home Assistant and smart-home infrastructure. |
| ❌ | Apple Bridge | Calendar, Mail, Contacts, Reminders, and related services. |
| ❌ | Internet Gateway | A separate internet-facing trust zone. |
| ❌ | Room Satellite | A physical microphone, speaker, display, and sensor endpoint. |
| ❌ | Control Center | Administration, diagnostics, and configuration. |

Reliability is deliberately **not** a core, because it is a property of every
core rather than a place in the system: failures should degrade predictably
instead of collapsing. Security is the exception — authority, permissions, and
trust boundaries are enforceable only if something owns them, so Security Core
is a core.

The list has no end state by design. The goal is not to build everything that
can be imagined — it is to avoid making any of it unnecessarily difficult later.

## Why submodules

A submodule reference is a pinned commit, not a copy. That gives three
properties worth the small amount of ceremony:

1. Each core stays clonable, buildable, and releasable on its own.
2. One commit in this repository records a combination of eleven repositories
   that is known to work together.
3. There is exactly one source of truth per core. Nothing is duplicated, so
   nothing can drift.

---

## Mark I lineage and recovery

M.A.R.K. II continues the completed
[Assistant M.A.R.K. I](https://github.com/Brightwav3/Assistant-mark-I)
meta-repository.

The initial M.A.R.K. II baseline preserves the exact submodule graph recorded by
the frozen Mark I root commit:

```text
99904d756d370ccc585640b5eb430f4b1bd0626c
```

The stable tag `mark-i-baseline` exists in the Mark I meta-repository, the Mark II
meta-repository, and all eleven child repositories. It points to the exact
commits that formed the original Mark I graph.

It does not prevent child repositories from evolving, and it does not change
the Mark I history. Mark I is historical infrastructure. M.A.R.K. II is the
active development line. Future submodule pointer updates belong to M.A.R.K. II.

---

## Inherited baseline

The inherited Mark I composition already demonstrates:

- double-clap activation;
- native Gemini Live bidirectional audio;
- microphone input and PCM frameization;
- spoken model output;
- immediate interruption and barge-in playback cancellation;
- compact conversation summaries;
- SQLite persistence and restart-safe recall;
- State Core publication;
- safe realtime tools;
- denied and invalid tool request handling;
- cancellation propagation;
- late-result protection;
- external content treated as data rather than instruction.

The inherited realtime tool catalogue is intentionally safe and read-only by
default: `get_time`, `calculate`, `uptime`, and `system_status`. Side-effecting
capabilities such as `open_app` remain explicit opt-ins.

These capabilities are the starting point for M.A.R.K. II, not its complete
definition.

---

## Current technical boundary

The current Gemini Live model remains turn-based. It can support interruption
and barge-in, but it does not provide native full-duplex conversational
behavior, continuous overlap, or semantic backchannels.

M.A.R.K. II therefore improves the application boundary around the model:

- cancellation must be immediate and observable;
- output must be rejected after session closure;
- delegated work must be correlated with its interaction;
- state must survive interruption and recovery;
- audio capture and playback must eventually share the signal information
  required for AEC;
- provider-specific behavior must remain behind provider-neutral contracts.

The modular Scribe → Intelligence → Voice path is not yet hardware-verified as
the primary conversation path. The native realtime safe-tool path is verified;
the explicit `open_app` process-launch probe remains separate.

---

## Development direction

M.A.R.K. II development should prioritize:

1. Voice × Intelligence integration.
2. Delegation from realtime interaction into deeper reasoning.
3. Serious but explicitly bounded tools.
4. Lower perceived latency and better endpointing.
5. Reliable interruption, cancellation, and recovery.

Next, the system should improve audio coordination, state-aware workflows,
provider switching, background task handling, and full-duplex-ready contracts.

The goal is not to add the largest possible number of tools. The goal is to make
the assistant capable of completing meaningful work safely.

---

## Safety and authority

A model suggestion is not authority.

Tools must remain explicitly declared, schema validated, policy checked,
capability bounded, observable, cancellable, and resistant to invalid or
hallucinated arguments.

Side-effecting capabilities require explicit enablement. The default system
should remain safe and read-only where possible. External content is data, not
instruction.

The model may request an action, but the platform decides whether that action is
valid, permitted, and executable.

---

## Getting started

Clone the active M.A.R.K. II line with all submodules:

```bash
git clone --recurse-submodules https://github.com/Brightwav3/Assistant-mark-II.git
cd Assistant-mark-II
```

To restore the inherited Mark I baseline instead:

```bash
git clone --branch mark-i-baseline --recurse-submodules https://github.com/Brightwav3/Assistant-mark-II.git
```

The `--recurse-submodules` option is required. Without it, the core
directories are empty gitlink entries.

Build and verify the independent cores:

```bash
for dir in \
  activation-core \
  core-runtime \
  device-network \
  intelligence-core \
  memory-core \
  state-core \
  tool-system \
  host-tools \
  "speech-system/realtime core" \
  "speech-system/scribe core" \
  "speech-system/voice core"; do
  (
    cd "$dir"
    npm install
    npm run verify
  )
done
```

Verify the composed runtime:

```bash
cd assistant-runtime
npm install
npm run verify
```

Individual repositories document their own verification commands and known
limitations in `README.md` and `PROGRESS.md`.

---

## The long-term test

The architecture should pass this migration:

```text
M.A.R.K. II intelligence
         │
         ▼
same platform
same tools
same memory
same state
same permissions
same devices
same interfaces
         ▲
         │
Future M.A.R.K. III intelligence
```

A better model should improve the assistant without requiring its nervous system
to be rebuilt.

That is the purpose of M.A.R.K. II.

---

## License

This repository is licensed under
[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/).

Each core is an independent repository and may carry its own license and terms.
