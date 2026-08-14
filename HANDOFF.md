# Handoff — M.A.R.K. II Memory v2

Date: 2026-08-14

## Current state

Memory v2 implementation was started in the existing local checkout
`C:\Users\Sajmon\Jarvis`. Work is isolated on local branches named
`codex/memory-v2` in the affected repositories. Nothing from this work was
pushed to a remote and the Mark II root pointer update was not committed.

The existing untracked root `CHANGELOG.md` was preserved and not staged.

## Completed child work

### `memory-core`

Branch: `codex/memory-v2`

Commits:

- `92d20db` — `docs: record layered memory architecture`
- `f9e741d` — `feat: add versioned memory schema foundation`
- `ec6c978` — `feat: add durable conversation episode lifecycle`
- `1f31a3a` — `feat: add bounded semantic memory retrieval`
- `d1a9b7a` — `feat: update in-progress episode turns`

Implemented and verified:

- ADR separating conversation episodes from semantic memories.
- SQLite schema v2 with idempotent migration from the existing v1 database.
- Preservation of legacy IDs, status, provenance, and records.
- Classification of legacy automatic summaries into `episode_summaries`.
- Episode sessions and turns with interruption, closure, late-event, and
  independent-forget behavior.
- Deterministic bounded retrieval with subject, lifecycle, validity, expiry,
  ranking, limit, token budget, structured-key matching, and diacritic-aware
  text matching.
- In-progress turn text updates for cumulative realtime transcript fragments.

Last verified result: `npm run verify` passed with 32 tests, typecheck, and
build.

### `intelligence-core`

Branch: `codex/memory-v2`

Commit:

- `2ba2ad0` — `feat: add provider-neutral memory extraction boundary`

Implemented and verified:

- Provider-neutral `MemoryCandidate`, `MemoryExtractor`, extraction input,
  disposition, evidence, and reason contracts.
- Deterministic offline no-op extractor.
- Bounded `MemoryContextRequest` with subject, query, kinds, limit, and token
  budget.
- Context assembly label changed to `Memory data (untrusted): ...`.
- `IntelligenceRequest.memory_context` replaces the undocumented memory
  metadata side channel.

Last verified result: `npm run verify` passed with 31 tests, typecheck, and
build.

### `assistant-runtime`

Branch: `codex/memory-v2`

Commit:

- `38eeccf` — `feat: integrate layered memory into assistant runtime`

Implemented and verified:

- `EpisodeMemoryWriter` maps realtime lifecycle events into episode sessions
  and turns.
- Delta and cumulative output transcript modes.
- Interrupted output becomes an interrupted assistant turn.
- Session closure is idempotent; late events are ignored.
- Flush closes active sessions without merging different sessions.
- `MemoryExtractionOrchestrator` applies candidates through Memory Core and
  reports `confirm`, `episode_only`, and `discard` dispositions.
- Native realtime context uses bounded subject-aware `memory.retrieve`.
- Modular requests use `memory_context`, not `metadata.memory`.
- Existing conversation-memory test now verifies episode persistence rather
  than automatic semantic summary creation.
- Retrieval and episode settings have safe defaults in runtime configuration.

Last verified result: `npm run verify` passed with 58 tests, typecheck, and
build.

## Task 7 interruption point

The following files are present in `assistant-runtime` but are uncommitted:

- `src/gemini-memory-extractor.ts`
- `tests/gemini-memory-extractor.test.ts`

The extractor implementation was added, but the verification command was
interrupted before its result was returned. Do not claim this task is green
until the following command passes:

```powershell
cd C:\Users\Sajmon\Jarvis\assistant-runtime
npm test -- --test-name-pattern="gemini-memory"
npm run verify
git diff --check
```

The implementation is not yet wired into production composition. Current
composition still uses `DeterministicMemoryExtractor`, which is intentional
until the Gemini extractor has passed its validation tests and configuration
policy is connected.

Task 7 intended behavior:

- Gemini returns structured JSON proposals only.
- malformed output stores nothing and emits a diagnostic;
- invalid kind, confidence, subject, or evidence is rejected;
- only high-confidence `preference` and `instructional` candidates remain
  auto-storable;
- uncertain candidates become `confirm`;
- cancellation propagates through the model boundary.

## Mark II root state

The root is on local branch `codex/memory-v2` at `b437fca`. The following
gitlinks are modified locally but not committed in the root:

| Submodule | Mark II current local pointer |
| --- | --- |
| `memory-core` | `d1a9b7adb6d529ae7c2a863711103dc9b1bd89fd` |
| `intelligence-core` | `2ba2ad0c01f2a6f7b087cf0a5a5a2c89e0117edc` |
| `assistant-runtime` | `38eeccff700859c787c626f288b63a47880f7f61` |

The root still points to the previous Mark I baseline in its committed tree.
After Task 7 is green and committed, update these three gitlinks, run the
root integration verification, update the Mark II README/documentation, and
commit the meta-repository pointer update.

## Remaining work from the plan

1. Finish and verify Task 7; wire the guarded Gemini extractor only after its
   tests pass.
2. Implement Task 8 migration inspection, dry-run, backup/export, local
   `.runtime/memory.sqlite` verification, and recovery documentation.
3. Add optional embeddings only after deterministic retrieval is stable.
4. Update the Mark II root README and gitlinks.
5. Run the composed integration check and perform the local memory smoke test.
6. Push only after all child and root checks pass.

## Important architectural constraints

- Gemini proposes; Memory Core validates, persists, deduplicates, and applies
  lifecycle/policy decisions.
- Raw microphone audio is never persisted.
- Episodes and semantic memories have independent forget behavior.
- Embeddings are not required for the first milestone.
- Do not turn automatic conversation summaries into user-approved facts.
- Do not force-reset or overwrite the existing root `CHANGELOG.md` without
  inspecting its ownership first.


---

## Addendum — 2026-08-14, echo cancellation work

Added after the fact by a later session, rather than rewriting the handoff above.
Two statements in it are now out of date, and one architectural constraint needs
a decision from the owner.

**"Nothing from this work was pushed to a remote" no longer holds.** The
`codex/memory-v2` branch of `assistant-runtime` was pushed on 2026-08-14, and it
carries the memory-v2 commits described above along with the echo cancellation
work. `aec-system` was pushed to `main`. The Mark II root pointer update is
committed as of this commit.

**"Raw microphone audio is never persisted" now has an exception, and it is
deliberate but unreviewed.** `assistant-runtime`'s `echoCancellation.recordDir`
writes the played, captured, and cleaned streams to disk for offline analysis.
It is off by default and off in the local `config.json`; it was switched on
during the hardware runs on 2026-08-14, and roughly 13 MB of real conversation
audio is in `.runtime/aec/` on this machine as a result. That audio is the only
real-hardware evidence this project has, and every measurement in
`aec-system/PROGRESS.md` about real echo comes from it, so it was kept rather
than deleted.

The constraint above is written as absolute. Either it means "the memory system
never persists raw audio", in which case a diagnostic recorder outside memory is
consistent with it and the wording should say so, or it means what it says, in
which case the recorder should be removed and the recordings with it. That is the
owner's call, not a later session's.
