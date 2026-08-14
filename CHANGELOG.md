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
