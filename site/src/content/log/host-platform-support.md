---
title: "Windows is verified. macOS and Linux are not claimed."
date: 2026-07-20
area: Audio
mark: II
status: Needs work
summary: "Microphone capture, playback, and activation input are platform leaves. Only the win32 leaf exists, and package metadata is not evidence."
---

Shared runtime, contracts, memory, state, intelligence, tools, and the realtime contracts are
platform-neutral. Microphone capture, speaker playback, and the activation input are platform
leaves selected by `createPlatformServices(process.platform)`. Shared composition never constructs
a platform implementation directly.

| Host | Status | Evidence |
| --- | --- | --- |
| Windows x64 | Ready | Source, deterministic tests, and the Windows CI job with real ffmpeg/ffplay |
| macOS (darwin) | Needs work | No adapter. Microphone and playback report degraded with a reason |
| Linux | Needs work | Same as macOS |

Before either non-Windows host may be called supported:

1. Write a `darwin` leaf (CoreAudio or AVFoundation capture, `afplay`/ffplay playback) and a
   `linux` leaf (ALSA/PulseAudio capture, ffplay playback).
2. Confirm the `decibri` capture dependency actually installs and opens a device on each host. Its
   package metadata advertises win32/darwin/linux; that metadata is not evidence.
3. Run a real device smoke test — capture a clap, play PCM back, complete one native Gemini Live
   turn — on physical hardware.

No macOS or Linux hardware has been exercised. The cross-platform CI leg is a non-blocking
typecheck only and proves nothing about audio behaviour.
