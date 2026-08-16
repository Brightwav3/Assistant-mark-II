# Changelog

Notable changes to M.A.R.K. II and its pinned cores. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Host support claims in this file use the project's evidence scale:

- **VERIFIED** — source, deterministic tests, and available hardware evidence.
- **PARTIAL** — implementation exists, hardware not verified.
- **UNVERIFIED** — platform is not tested locally.
- **MISSING** — no adapter exists.

---

## [Unreleased]

### Added

- **Session handoff wired into the running assistant** (`assistant-runtime`,
  branch `feat/handoff-wiring`). The handoff mechanism shipped complete and
  tested but with no wire into a running assistant; it now has one. Still off by
  default — `handoff.enabled` remains `false`.
- Multi-session support in `RealtimeCoreAdapter`: `openReplacement()`,
  `prefillSession()`, `activateSession()`, `closeSession()`, and
  `activeSessionId()`. Every open session runs its own event pump, so a
  replacement is not deaf to what the provider says about the context it was
  prefilled with.
- `RollingTranscript` (`src/handoff/transcript.ts`) — the conversation, held by
  the runtime rather than read back off the session that is being replaced.
  Bounded, and it reports how many turns it dropped.
- `createRealtimeHandoffController` (`src/handoff/realtime-controller.ts`) —
  the whole translation between the handoff's `HandoffSessionController` and the
  live adapter. Realtime Core still knows nothing about handoff.
- `HandoffCompositionOptions.onCompacted`, so the runtime's transcript is
  reseeded with the summary the replacement was actually prefilled with rather
  than starting empty and losing it at the next handoff.
- `RealtimeSessionKind` (`"interaction" | "handoff"`) on the `onSession`
  subscription. A fresh interaction starts a new logical session; a handoff
  continues the one already running.
- `tests/handoff-wiring.test.ts` (8 cases) against the real adapter and the real
  multi-session Realtime Core. Audio ownership is proven by sending frames and
  reading the provider's per-session counters, never by reading a variable the
  code under test also wrote.
- **Platform boundary in `assistant-runtime`** (`src/platform/`). A typed
  `PlatformServices` contract covering the activation microphone, PCM playback,
  and the local STT/TTS/output stack, selected through a single factory:
  `createPlatformServices(process.platform)`.
- `PlatformUnsupportedError`, `PcmPlayerSpec`, `PlatformSpeechStack`, and
  `PlatformCapability` (`supported` / `degraded` / `unsupported` with a reason).
- Windows leaf (`src/platform/windows.ts`) — the only file in shared runtime
  that names a `Windows*` implementation.
- Unsupported leaf (`src/platform/unsupported.ts`) — returns a structured
  `unsupported` capability for hosts with no adapter instead of throwing at
  import time or pretending hardware exists.
- `ClapListener` / `ClapListenerOptions` contract in `activation-core`
  (`src/audio/listener.ts`) as the activation input boundary.
- `LocalClapListener` — the former `WindowsClapListener` implementation, renamed
  to match what it actually does.
- Deterministic platform tests (`tests/platform-factory.test.ts`, 7 cases) that
  run with no microphone, speaker, API key, or network, including failure-path
  coverage for an absent platform leaf.
- Non-blocking `portability-typecheck` CI job on `ubuntu-latest` and
  `macos-latest`. A portability signal only — it exercises no audio.
- README section "Host platform support" naming the per-host status and the
  exact hardware smoke test still owed.

### Changed

- **Delegation delivery is bound to a logical session id, not to the physical
  session rendering it** (`composition.ts`). This is the change the handoff
  could not be wired in without: after a commit `session.id` is a different
  string, and every delegation queued against the old one would be stranded at
  exactly the moment its answer is due. It affects the live path whether or not
  `handoff.enabled` is set, so the hardware smoke test is owed regardless.
- `composition.ts` now builds a handoff assembly per interaction, feeds the
  context estimator from the realtime event stream (transcripts *and* audio
  duration, in both directions), drives the idle gate from user speech, and
  calls `maybePrepare()` after each recorded turn.
- Echo cancellation rebinding points at the real `EchoGuard` instead of the test
  double. Rebinding stays owned solely by the handoff's echo rebinder;
  `activateSession` deliberately does not touch it, so there is exactly one
  place that does.
- A session ending only tears down shared capture state if it was the session
  that owned audio. Previously any session's close cleared it, which with two
  sessions open would let a failing replacement silence the one still talking to
  the user.
- `composition.ts` no longer imports or constructs `WindowsClapListener`. It
  takes a platform leaf, injectable via `AssistantCompositionOptions.platform`.
- `modular.ts` no longer imports `WindowsSpeechRecognitionProvider`,
  `WindowsSpeechTtsProvider`, or `WindowsAudioOutput`. `ModularSpeechDriver`
  now requires a `PlatformSpeechStack`, and reports the stack's own descriptors
  through `capabilities()` instead of hardcoded `windows_*` strings.
- The playback executable comes from the platform leaf. `RealtimeCoreAdapter`
  accepts a `PcmPlayerSpec` (defaulting to `PCM_PLAYER`), and the `playback`
  component capability reports the leaf's executable rather than a literal
  `"ffplay.exe"`.
- `AssistantComposition` now exposes the resolved `platform` for diagnostics.
- The modular PCM stream id is `local-default-microphone`, was
  `windows-default-microphone`.
- An unsupported host reports `degraded` `microphone`, `playback`, and
  `modular` components carrying a reason. The runtime still starts; it does not
  silently fall back to a different interaction mode.

### Deprecated

- `WindowsClapListener` and `WindowsClapListenerOptions` in `activation-core`.
  Both remain as aliases of the `Local*` names so existing callers and CLIs keep
  compiling. The implementation was never Windows-specific — it opens
  `decibri`'s host microphone binding, with no WASAPI, DirectShow, or PowerShell
  involved.

### Hardware follow-up

The handoff wiring and its live continuation are now hardware-qualified on
Windows. The 2026-08-16 run also confirmed an inaudible cutover, stable AEC,
post-handoff recall, and delegated shutdown. The provider transcript may render
Czech confirmation as garbage when its language detection is wrong; the
voice-to-voice heard record is authoritative for the user's meaning.

The only remaining live follow-up is the exact spoken wording after the newly
clarified refusal of an implicit memory write. The guard and regression test
already prove that no unsafe memory write occurs.


### Host support status

| Host | Status | Evidence |
| --- | --- | --- |
| Windows (win32) | **VERIFIED** | Source, deterministic tests, and the Windows CI job with real ffmpeg/ffplay. `activation-core` 9/9 and `assistant-runtime` 46/46 pass; typecheck and build clean. |
| macOS (darwin) | **MISSING** | No adapter. Factory returns `unsupported`. |
| Linux | **MISSING** | No adapter. Factory returns `unsupported`. |

No macOS or Linux hardware was exercised. Compile success is not treated as
support. Remaining work before either host may be called supported is listed in
the README.

### Not changed

Gemini, Memory Core, State Core, Tool System, and the Realtime Core contracts
were not rewritten. Tool System remains the single policy, validation, broker,
and execution enforcement point. No second platform-specific tool policy exists.
The historical `activation-gemini-bridge` was not touched. Platform-specific
implementations were not duplicated into per-OS copies of the assistant.

### Pinned commits

| Repository | Commit |
| --- | --- |
| `activation-core` | `af19909` |
| `assistant-runtime` | `3bb45c9` |
| meta (`Assistant-mark-II`) | `3cc57a9` |

---

## [Baseline] - before 2026-08-14

Prior history is recorded in the individual core repositories and in
[`README.md`](./README.md). Highlights of the M.A.R.K. II lineage baseline:

- Assistant runtime composing activation, realtime speech, intelligence,
  memory, state, and tools behind provider-neutral contracts.
- Native realtime mode over Gemini Live, plus a modular STT/LLM/TTS mode.
- Tool System policy, allowlisting, argument validation, and cooldowns.
- Windows-only CI proving the pinned combination of cores builds and composes.
