# Current Implementation Baseline

**Last checked: 2026-08-11.**

## First usable local assistant slice

`assistant-runtime` is **IN PROGRESS — usable v0.1, production hardening remaining**.

Verified in the repository:

- double-clap activation;
- Gemini Live native audio path;
- microphone PCM routing to the active session and speaker playback;
- barge-in output cancellation;
- automatic compact conversation summaries in SQLite Memory Core;
- memory surviving a runtime restart;
- State Core interaction and speech facts;
- inactivity timeout and safe shutdown;
- API-key environment boundary with no credential in Git;
- `npm run verify`: 15 passing tests, typecheck, and build.

Known limitations:

- real microphones can occasionally lose speech detection;
- `realtime.session.closed` currently requires a new activation;
- summaries do not automatically infer intelligent preferences or facts;
- the modular Scribe → Intelligence → Voice path is not fully hardware-verified.

## Repository status

| Repository | Status | Primary ownership |
| --- | --- | --- |
| [Core Runtime](../../core-runtime/README.md) | Phase 0 complete | lifecycle, configuration, events, local API, health |
| [Device Network](../../device-network/README.md) | v0.1 complete | protocol, registry, WebSocket transport, liveness, commands, events |
| [Activation Core](../../activation-core/README.md) | v0.1 complete | activation providers and detection events |
| [Speech System](../../speech-system/README.md) | component foundations complete | Scribe, Voice, and Realtime Core |
| [Intelligence Core](../../intelligence-core/README.md) | core complete | model, context, action, and production boundaries |
| [Memory Core](../../memory-core/README.md) | v0.1 complete | deliberate durable memory and retrieval |
| [State Core](../../state-core/README.md) | v0.1 complete | current state, freshness, revisions, subscriptions |
| [Assistant Runtime](../../assistant-runtime/README.md) | usable v0.1, hardening in progress | cross-core composition and interaction lifecycle |

## Next hardening work

1. Run and document the real native microphone, Gemini, and speaker smoke test.
2. Improve speech-detection resilience on real microphones.
3. Decide whether closed realtime sessions should auto-reopen or require explicit activation.
4. Verify the modular Scribe → Intelligence → Voice path on hardware.
5. Add deliberate preference/fact extraction only with an explicit memory policy.
