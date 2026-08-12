# Jarvis Architecture

These documents describe the boundaries that make the manifesto implementable. Each file owns one topic; none of them is intended to be the whole system specification.

## Read by topic

- [Identity and boundaries](./01-identity-and-boundaries.md)
- [Headless and agent-first contracts](./02-headless-and-agent-first.md)
- [Models and provider independence](./03-models-and-provider-independence.md)
- [Voice and interaction](./04-voice-and-interaction.md)
- [State, memory, and automation](./05-state-memory-and-automation.md)
- [Tools and external systems](./06-tools-and-external-systems.md)
- [Security and privacy](./07-security-and-privacy.md)
- [Reliability and observability](./08-reliability-and-observability.md)
- [Physical space and interfaces](./09-physical-space-and-interfaces.md)
- [Development and roadmap](./10-development-and-roadmap.md)
- [Current implementation baseline](./current-baseline.md)

## Ownership map

| Area | Owns | Does not own |
| --- | --- | --- |
| Core Runtime | lifecycle, configuration, events, health, local runtime API | AI, voice, memory, devices, tools |
| Assistant Runtime | composition, interaction lifecycle, activation-to-conversation flow, timeout and shutdown coordination | provider internals, device protocol, GUI |
| Activation Core | activation providers, detection filtering, activation events | conversation policy, STT, TTS, model reasoning |
| Speech System | audio input, transcription, synthesis, playback, native realtime sessions | general conversation policy, memory, permissions |
| Intelligence Core | model boundary, context assembly, action loop, routing and traces | credentials, durable memory storage, transport ownership |
| Memory Core | deliberate durable memory and retrieval | automatic extraction, raw audio, current state |
| State Core | current facts, freshness, revisions, subscriptions | durable memory, inference, authorization |
| Device Network | device identity, protocol, transport, liveness, commands, events | physical device implementation and domain policy |

## Boundary rules

- Prefer public package exports over private-source imports.
- Keep trust boundaries explicit and validate untrusted input at the edge.
- Keep essential behavior testable without hardware, credentials, or a GUI.
- Add a new repository when a responsibility becomes independently testable and independently owned.
- Keep current status in `current-baseline.md`, repository `PROGRESS.md` files, and the root manifest—not in durable principle documents.
