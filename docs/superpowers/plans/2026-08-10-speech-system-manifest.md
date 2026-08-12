# Speech System Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Jarvis manifesto describe the implemented Speech System and Gemini Live Realtime Core accurately.

**Architecture:** Add a compact current-state section to the existing manifesto, immediately after the interaction-channel principle. The section documents deployed subsystem boundaries and links to detailed subsystem documentation; it does not alter the long-term roadmap or expose Gemini SDK details as public architecture.

**Tech Stack:** Markdown documentation only.

## Global Constraints

- Modify only `C:\Users\Sajmon\Jarvis\README AGENTS.md` for the delivered documentation change.
- Keep Gemini Live a provider-specific adapter inside provider-neutral Realtime Core contracts.
- Do not claim that Intelligence Core, Interaction Core, acoustic echo cancellation, or physical device runtime are complete.
- Do not include credentials, API-key values, or local environment configuration values.

---

### Task 1: Document the current Speech System

**Files:**
- Modify: `C:\Users\Sajmon\Jarvis\README AGENTS.md` after the `# 2. Interaction Channels Are Independent` section and before `# 3. Identity Is Not Architecture`
- Verify: `C:\Users\Sajmon\Jarvis\speech-system\README.md`
- Verify: `C:\Users\Sajmon\Jarvis\speech-system\realtime core\README.md`

**Interfaces:**
- Consumes: Implemented documentation boundaries for Scribe Core, Voice Core v0.1, and Realtime Core.
- Produces: A manifest-level map of current speech subsystem ownership and Gemini Live's provider-neutral integration boundary.

- [ ] **Step 1: Add the current-state section**

Insert `# Current Speech System` with this content:

````markdown
Jarvis currently has a headless Speech System in `speech-system/`.
It keeps speech input, text-to-speech, and native realtime model sessions as
separate cores rather than making any speech provider the architecture.

```text
speech-system/
├── scribe core/       # microphone/audio input → transcript and interruption signals
├── voice core/        # text → synthesized audio → controlled playback
├── realtime core/     # persistent native-audio model sessions
└── interaction core/  # future conversation-flow coordination
```

| Core | Owns | Does not own |
| --- | --- | --- |
| Scribe Core | Audio input, VAD/segmentation, STT, transcripts, interruption signals | TTS, reasoning, memory |
| Voice Core v0.1 | TTS, output discovery, playback, cancellation | STT, microphone/VAD, reasoning, memory |
| Realtime Core | Provider-neutral native-audio sessions, PCM event contracts, output authority | STT/TTS internals, reasoning, memory, GUI |
| Interaction Core | Future cross-core conversational policy | Provider SDKs and device implementation |

Gemini Live is currently a private adapter inside Realtime Core. Its SDK types,
credentials, and provider protocol do not cross the public session boundary.
When Gemini detects barge-in it sends `serverContent.interrupted`; Realtime Core
emits provider-neutral `output.interrupted`, rejects stale output, and immediately
stops buffered playback. Acoustic echo cancellation remains a future device-layer
concern.

Detailed subsystem documentation lives in
[`speech-system/README.md`](./speech-system/README.md).
````

- [ ] **Step 2: Verify documentation accuracy**

Run:

```powershell
rg -n "Scribe Core|Voice Core v0.1|Realtime Core|Interaction Core" "C:\Users\Sajmon\Jarvis\README AGENTS.md"
rg -n "Gemini Live|output.interrupted|Acoustic echo" "C:\Users\Sajmon\Jarvis\README AGENTS.md"
Test-Path "C:\Users\Sajmon\Jarvis\speech-system\README.md"
```

Expected: all four core names, the provider-neutral interruption semantics, and a
valid detailed-documentation target are present.

- [ ] **Step 3: Check for leaked credentials**

Run:

```powershell
rg -n -i 'AIza[0-9A-Za-z_-]{20,}|GEMINI_API_KEY\s*[:=]\s*["'"'][^"'"']+' "C:\Users\Sajmon\Jarvis\README AGENTS.md"
```

Expected: no matches.
