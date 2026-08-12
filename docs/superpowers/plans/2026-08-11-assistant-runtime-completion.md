# Assistant Runtime Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `assistant-runtime` from a tested composition skeleton into a configuration-driven runtime that composes activation, realtime speech, SQLite memory, and State Core through public package exports.

**Architecture:** `createAssistantRuntime` owns construction and lifecycle. Adapters translate public sibling-package contracts into the runtime's narrow contracts. The native path keeps microphone PCM in memory, feeds the activation detector and the active Gemini session, and publishes interaction state; memory is opened independently and is queried for bounded context without storing raw audio or full transcripts.

**Tech Stack:** Node.js 22+, TypeScript, Node `node:sqlite`, `activation-core`, `realtime-core`, `memory-core`, `state-core`, and existing Windows `decibri`/`ffplay.exe` adapters.

## Global Constraints

- Production code uses only public package exports.
- `GEMINI_API_KEY` is read only from the process environment.
- No raw audio or automatic full-transcript archive is persisted.
- Memory database state lives under ignored `.runtime/` by default and is not removed by wiring cleanup.
- Offline tests use fake providers; hardware and credentials remain explicit smoke-test prerequisites.

---

### Task 1: Configuration-driven composition root

**Files:**
- Create: `assistant-runtime/config.example.json`
- Create: `assistant-runtime/src/config.ts`
- Create: `assistant-runtime/src/composition.ts`
- Modify: `assistant-runtime/src/contracts.ts`
- Modify: `assistant-runtime/src/adapters.ts`
- Modify: `assistant-runtime/cli/main.ts`
- Test: `assistant-runtime/tests/composition.test.ts`

**Interfaces:**
- Produces `loadRuntimeSettings()` and `createAssistantRuntime()` for the CLI and consumers.
- The composition root creates real activation, microphone, realtime, memory, and state components for native mode.

- [ ] **Step 1: Add the tracked example configuration and strict loader.**
- [ ] **Step 2: Add component adapters exposing actual health and capabilities.**
- [ ] **Step 3: Add `createAssistantRuntime()` with deterministic start/stop order.**
- [ ] **Step 4: Replace CLI hard-coded construction with the composition root.**
- [ ] **Step 5: Test config defaults, component capabilities, and no-key health degradation.**

### Task 2: Durable memory and state integration

**Files:**
- Modify: `assistant-runtime/src/composition.ts`
- Modify: `assistant-runtime/src/adapters.ts`
- Modify: `assistant-runtime/src/runtime.ts`
- Modify: `assistant-runtime/cli/main.ts`
- Test: `assistant-runtime/tests/memory-state.test.ts`

**Interfaces:**
- Memory is exposed through JSON list/add/search/forget commands.
- Durable facts are created only by explicit CLI add operations; native conversation context is read-only by default.
- State Core receives `interaction.active`, `interaction.id`, `assistant.mode`, `speech.input`, `speech.output`, and `runtime.error` facts.

- [ ] **Step 1: Compose `MemoryRuntime(SqliteMemoryStore)` and `StateRuntime` as lifecycle components.**
- [ ] **Step 2: Publish interaction lifecycle and speech/error facts through public State Core APIs.**
- [ ] **Step 3: Add bounded memory context to the realtime system instruction without persisting audio.**
- [ ] **Step 4: Add JSON memory commands and preserve the database during wiring removal.**
- [ ] **Step 5: Test restart persistence, search/forget, and state cleanup.**

### Task 3: Continuous audio routing and reliability

**Files:**
- Modify: `assistant-runtime/src/adapters.ts`
- Modify: `assistant-runtime/src/runtime.ts`
- Modify: `assistant-runtime/tests/runtime.test.ts`
- Create: `assistant-runtime/tests/audio-routing.test.ts`

**Interfaces:**
- Microphone frames are forwarded to clap detection and the active realtime session.
- Session close, interruption, duplicate activation, stale completion, and player failure are observable and cannot revive an ended interaction.

- [ ] **Step 1: Add a bounded pre-session PCM queue and flush it after realtime connect.**
- [ ] **Step 2: Add explicit audio/session lifecycle callbacks and state updates.**
- [ ] **Step 3: Verify cancellation, timeout, interruption, and stale-result behavior offline.**
- [ ] **Step 4: Run typecheck, tests, build, and all JSON diagnostics.**

### Task 4: Operational verification

**Files:**
- Modify: `assistant-runtime/README.md`
- Modify: `assistant-runtime/PROGRESS.md`
- Modify: `assistant-runtime/start-jarvis.ps1`
- Create: `assistant-runtime/reset-memory.ps1`

- [ ] **Step 1: Validate local config and required runtime directories in the launcher.**
- [ ] **Step 2: Add the explicit memory reset command.**
- [ ] **Step 3: Document offline verification and credentialed hardware smoke commands.**
- [ ] **Step 4: Run the complete verification matrix and record remaining external prerequisites.**
