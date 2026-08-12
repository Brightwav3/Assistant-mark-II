# Assistant mark I

Infrastructure for a persistent, ambient, model-independent personal assistant.

This is the meta-repository. It contains the manifesto and every core linked as a
git submodule. Each core remains a fully independent repository with its own
history, workplan, and issues.

## On the name "Jarvis"

**Jarvis is a working name, not the product name.**

It appears throughout the manifesto, the architecture documents, and the agent
instructions. It is used deliberately, for one reason: it is a single word that
communicates the entire intent of the project without a paragraph of explanation.
Saying "I'm building Jarvis" ends the question. Saying "I'm building headless,
provider-independent assistant infrastructure" starts three more.

That convenience is the whole justification. It is not a commitment.

Two consequences follow, and both are intentional:

1. **The name never reached the code.** Every package is named for what it does —
   `core-runtime`, `memory-core`, `state-core`, `intelligence-core`,
   `device-network`, `activation-core`, `realtime-core`, `scribe-core`,
   `voice-core`. Directory names match their packages one-to-one. No component
   carries the working name.
2. **Renaming stays cheap forever.** Because the name lives only in prose, the
   final product name can be chosen at any point without touching a single
   module, import, or contract.

"Jarvis" will not be the shipped name — it belongs to Marvel/Disney. The manifesto
keeps it because a manifesto is written for a human reader who needs to know what
kind of thing is being built, and the name does that job in one word.

## What this is

Read [the manifesto](./MANIFESTO.md) first. The short version:

> A better model should fit into the same assistant without requiring the nervous
> system to be rebuilt.

The assistant is larger than its interface. The model is a component. Voice, text,
displays, and devices are independent ways to reach the same system. Lifecycle,
validation, storage, permissions, and safety stay deterministic and belong to the
platform, not to whatever model is currently plugged in.

## Repository map

Every directory below is a git submodule pointing at a standalone repository.

| Core | Owns | Status |
| --- | --- | --- |
| [`core-runtime`](./core-runtime) | lifecycle, configuration, events, component registry, local API, health | Phase 0 complete |
| [`activation-core`](./activation-core) | activation providers and detection events | v0.1 complete |
| [`speech-system`](./speech-system) | Scribe Core, Voice Core, Realtime Core | component foundations complete |
| [`intelligence-core`](./intelligence-core) | model gateway, context, action, production boundaries | core complete |
| [`memory-core`](./memory-core) | deliberate durable memory and retrieval | v0.1 complete |
| [`state-core`](./state-core) | current state, freshness, revisions, subscriptions | v0.1 complete |
| [`device-network`](./device-network) | protocol, registry, WebSocket transport, liveness, commands | v0.1 complete |
| [`assistant-runtime`](./assistant-runtime) | cross-core composition and interaction lifecycle | usable v0.1, hardening in progress |
| [`activation-gemini-bridge`](./activation-gemini-bridge) | temporary activation-to-realtime bridge | temporary, private |

The cores have **zero imports between each other**. The only component that knows
about more than one core is `assistant-runtime`, which composes them behind typed
adapters.

## Planned structure

The nine repositories above are the beginning, not the shape. The full system is
planned as twenty-one phases. Each phase is expected to produce one real, testable
capability before the next major layer is added — the architecture grows vertically,
not by scaffolding everything at once.

Phases describe direction, not a fixed schedule.

### Built

| Phase | Capability | Where it lives |
| --- | --- | --- |
| 0 | **Foundation** — lifecycle, configuration, structured logging, local API, health, event bus, component registration, clean shutdown | `core-runtime` |
| 1 | **Device and Satellite Protocol** — device identity, room, capabilities, status, simulator; physical integration pending | `device-network` |
| 2 | **Voice Runtime** — replaceable WakeWord / STT / TTS / VAD providers, streaming, natural interruption; Interaction Core and full AEC pending | `speech-system`, `activation-core` |
| 3 | **Model Provider Layer** — provider-independent model contracts, context assembly, policy-gated actions; unified general model loop pending | `intelligence-core` |
| 8 | **State Engine** — current facts with provenance, freshness, confidence, revisions, subscriptions | `state-core` |

### Planned

| Phase | Capability |
| --- | --- |
| 4 | **Agent Runtime and Tool Calling** — the model reasons over platform capabilities, with iteration limits, timeouts, cancellation, structured errors, and execution tracing |
| 5 | **Permission and Policy Engine** — enforceable capability boundaries the model cannot bypass |
| 6 | **Physical Environment Integration** — reasoning over "this room", "the front door", not raw entity identifiers |
| 7 | **Display Protocol** — structured visual output without opening an application |
| 9 | **Persistent Memory** — deliberate long-term context, owned by the platform, independent of the provider (partially built in `memory-core`) |
| 10 | **Automation Engine** — deterministic triggers, conditions, and actions that run without AI |
| 11 | **Proactive Assistant** — selected events become candidate interruptions |
| 12 | **Model Router** — route by complexity, latency, privacy, availability, context size, cost; cheapest adequate intelligence by default |
| 13 | **Background Tasks** — work that outlives conversations and devices |
| 14 | **Tool Ecosystem** — digital capabilities behind stable agent-native contracts |
| 15 | **Multi-Room Assistant** — many satellites, one persistent assistant that knows where a request came from |
| 16 | **Presence and Environmental Context** — interaction follows the user, respecting privacy and uncertainty |
| 17 | **Reliability** — predictable degradation instead of collapse |
| 18 | **Security Hardening** — authentication, network isolation, encryption, secrets, tool permissions, prompt injection, audit logs, memory privacy, device spoofing, microphone isolation |
| 19 | **Tool SDK** — new capabilities as plugins, not architectural changes |
| 20 | **Long-Term Agent Platform** — deliberately open-ended: cooperating agents, local multimodal models, wearables, vision, robotics, knowledge graphs, cross-device continuity |

Phase 20 has no endpoint by design. The point is not to implement those things
because they can be imagined — it is to avoid making them unnecessarily difficult.

## Why submodules

A submodule reference is a pinned commit, not a copy. That gives three properties
worth the small amount of ceremony:

1. Each core stays clonable, buildable, and releasable on its own.
2. One commit in this repository records a combination of nine cores that is known
   to work together.
3. There is exactly one source of truth per core. Nothing is duplicated, so nothing
   can drift.

## Getting started

```bash
git clone --recurse-submodules https://github.com/Brightwav3/Assistant-mark-I.git
```

`--recurse-submodules` is required; without it the core directories are empty.
One submodule (`activation-gemini-bridge`) is currently private and will be skipped
unless you have access.

To verify the assembled slice:

```bash
cd assistant-runtime && npm install && npm run verify
```

## Current state

The first usable slice runs today: double-clap activation, Gemini Live native audio,
microphone routing, barge-in cancellation, conversation summaries persisted to
SQLite that survive a restart, inactivity timeout, and safe shutdown. It is verified
by 15 passing tests plus typecheck and build.

Each core repository documents its own verified state and known limitations in its
`README.md` and `PROGRESS.md`.

## License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/).
See [LICENSE](./LICENSE).

Use is permitted for noncommercial purposes only — personal use, research,
education, and public-benefit work. Any use by or for a business requires a
separate license. This applies to the meta-repository; each core is a separate
repository and carries its own terms.
