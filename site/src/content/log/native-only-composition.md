---
title: "One speech route, on purpose"
date: 2026-08-05
area: Voice
mark: II
status: Ready
summary: "The local Scribe → Intelligence → Voice composition is retired from assistant-runtime. It is not a fallback, not a second mode, and not part of the dependency graph."
---

The active Mark II runtime intentionally has one speech route:

```text
microphone → AEC System → Realtime Core → Gemini Live
                                      ├→ tools / memory / state
                                      └→ response audio
```

The former local `Scribe Core → Intelligence Core → Voice Core` composition is retired from
`assistant-runtime`. It is not a fallback path, not a second mode, and not part of the integration
dependency graph. Scribe Core and Voice Core remain independent sibling repositories for their own
component work; Mark II uses Gemini Live for speech understanding and response audio.

The realtime tool path is bounded. `RealtimeSessionConfig` declares the active safe catalogue and
`RealtimeSpeechEvent` carries correlated tool requests. Tool System validates arguments, applies
policy, executes the Host Tools catalogue, and returns the result to the native session. The default
read-only path — `get_time`, `calculate`, `uptime`, `system_status` — is hardware-verified.
Side-effecting tools such as `open_app` remain explicit opt-ins.
