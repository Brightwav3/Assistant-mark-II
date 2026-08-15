# Decision Documentation System

- **Status:** Draft — awaiting approval
- **Date:** 2026-08-15
- **Scope:** All repositories in the Jarvis meta-repository, plus the meta-repository itself
- **Harnesses:** Claude Code and Codex, treated as equals

## Problem

Architectural decisions do not survive between agent sessions. The failure is
not missing documentation — every repository already carries `README.md`,
`ARCHITECTURE.md`, `WORKPLAN.md`, `PROGRESS.md`, and `ISSUES.md`. The failure is
that a decision's reasoning has no assigned home, so it lands wherever the agent
that made it happened to be typing.

### Observed instance

New agent-callable capabilities — `memory-tools.ts`, `memory-create-tool.ts`,
`episode-tools.ts` — were created in `assistant-runtime/src/delegation/` rather
than declared in Host Tools, which is described as the library of tool
declarations and handlers.

Investigating this produced a more useful result than the misplacement theory it
started from. The placement was deliberate and correct. The reasoning, obtained
by asking the Codex session that made it, is that a delegated capability runs
asynchronously; while it runs, a voice model holding the turn has both the time
and the incentive to invent a result. Routing it through the Delegation Broker
removes that opening, because the broker mints the execution identity and the
model receives something real to acknowledge instead of a gap to fill. A Host
Tool answers within a second and offers no such gap.

That reasoning is also already written down, in the header of
`assistant-runtime/src/delegation/broker.ts`:

> It exists so that "I'll look into that" can be true the moment it is said. […]
> so the voice model has something real to acknowledge and correlate against, and
> never has to invent a result to fill the gap.

So the decision was made well, and documented well, and was still unavailable to
the next agent. Three separate defects explain that:

1. **Wrong genre.** The text answers *what does this broker do*. It does not
   answer *where does a new capability belong*. An agent creating a tool file has
   no reason to open `broker.ts`.
2. **No exclusivity anywhere.** Neither `host-tools/ARCHITECTURE.md` nor
   `tool-system/ARCHITECTURE.md` states which capabilities belong in Host Tools
   and which do not. Both describe mechanics. `tool-system` and `host-tools` are
   also the two repositories with no `docs/` directory at all.
3. **No cross-harness carrier.** The decision was made by Codex. No `AGENTS.md`
   exists anywhere in the ecosystem, so Codex works from no instruction file, and
   nothing it learns is written where a later session — of either harness — will
   read it.

The design must therefore capture reasoning at the moment it is produced, not
merely enforce rules already known. A system that only enforced known rules would
have forced this correct placement to be undone.

### Why instruction alone has already failed

`agent-first-repository-builder/SKILL.md` already instructs that
`ARCHITECTURE.md` must answer *why is it shaped this way*, and already warns that
an agent which only knows a boundary exists will route around it.

Despite that instruction, five of eleven repositories contain zero or one
occurrence of `because`, `rationale`, `decision`, or `trade-off` in
`ARCHITECTURE.md`. `activation-core/ARCHITECTURE.md` is seven lines.

The instruction is correct and is not followed. Better wording will not change
this. Omission must become visible, and where possible, mechanically detectable.

## Design

### Four document genres

Each genre has one audience, one rate of change, and one job. Mixing two genres
in one file causes the weaker job to be dropped silently.

| Genre | Audience | Read when | Length | Changes |
| --- | --- | --- | --- | --- |
| `CLAUDE.md` + `AGENTS.md` | Agent, loaded automatically | Every edit in that directory | 20–60 lines | Rarely |
| `INVARIANTS.md` | Agent and structure tests | When placing new code | One numbered list | On a new cross-boundary rule |
| ADR (`docs/decisions/NNNN-slug.md`) | Agent, on demand | When asking *why* | ~1 page | Append-only |
| Rozbor (`docs/deep/`) | Human, voluntarily | Learning or rebuilding | 5–20 pages | After a milestone |

#### `CLAUDE.md` and `AGENTS.md`

The only new files at repository root. They exist because they are the one
document loaded into an agent's context without the agent deciding to open it.
They carry rules, not description: what must not be done in this repository, and
which cross-boundary invariants apply here. Every applicable invariant is quoted
in full, not linked — see *Rule 3*.

Claude Code reads `CLAUDE.md`; Codex reads `AGENTS.md`. **Both files exist in
every repository with byte-identical content, and a structure test asserts they
match.** Duplication is chosen over an import directive or a symlink: an import
depends on one harness's resolution behaviour, and symlinks are unreliable on the
Windows host this ecosystem is developed on. A duplicate that is tested is safer
than a reference that is assumed.

#### `INVARIANTS.md`

Lives only in the meta-repository root. It is the single authority for rules that
span repository boundaries. Each invariant has a stable identifier (`INV-001`),
one normative sentence, the list of repositories it governs, and a pointer to the
ADR that established it.

An invariant is written **only after** the ADR that justifies it. Writing the rule
first is what nearly deleted the delegation-broker protection described above.

#### ADR

The only home for *why*. Format follows the existing
`memory-core/docs/decisions/001-memory-layers.md`, adopted unchanged as the
template, with one added section:

```
# ADR NNNN: <decision as a sentence>

- Status / Date / Decision owners

## Context
## Decision
## Rejected alternatives      <- required
## Consequences (Positive / Costs)
## Enforced in                <- required; see Inline references
## Explicit non-decisions     <- required
```

`Rejected alternatives` is what stops a future agent from re-deriving a discarded
option. `Explicit non-decisions` is what stops it from stretching the decision to
cover a case it never examined. Both are mandatory.

#### Rozbor

Long-form reconstruction narrative for a human reader, written after a milestone
completes. Dated as a snapshot of a moment, never maintained as live truth.
Deliberately excluded from every enforcement mechanism: it is the most expensive
genre and the fastest to rot, so it is produced on intent, not on trigger.

### Structural cut: `ARCHITECTURE.md` narrows

`ARCHITECTURE.md` currently carries two jobs — shape and reasoning. When an agent
writes only the shape, the file still looks complete. Nothing distinguishes "this
boundary had no reason" from "the reason was not written down".

From this design onward:

- `ARCHITECTURE.md` describes **shape only** — diagram, boundaries, what the
  repository owns and does not own.
- `docs/decisions/` is the **only home for reasoning**, and the directory is
  mandatory in every repository.

An empty `docs/decisions/` is visible. A missing paragraph is not. This converts a
silent omission into a detectable gap.

Existing rationale prose in `memory-core`, `aec-system`, and `assistant-runtime`
is migrated into retroactive ADRs rather than deleted.

### Repository skeleton

Identical in every repository:

```
<repo>/
  CLAUDE.md          rules; loaded automatically by Claude Code
  AGENTS.md          byte-identical copy; loaded automatically by Codex
  README.md          what this is
  ARCHITECTURE.md    how it is shaped
  WORKPLAN.md        the contract
  PROGRESS.md        where work resumes
  ISSUES.md          known defects
  docs/
    decisions/       why it is shaped that way
      README.md      placement rule, so an empty directory still instructs
      NNNN-slug.md   four-digit numbering, normalized
```

Meta-repository additionally:

```
Jarvis/
  INVARIANTS.md
  docs/
    decisions/       decisions touching two or more repositories
    deep/            rozbory
    superpowers/     unchanged
```

`PROGRESS.md`, `WORKPLAN.md`, and `ISSUES.md` stay at repository root. They churn
every session, but relocating them across eleven repositories buys nothing this
design needs.

### Placement rules

1. A decision contained within one repository → `<repo>/docs/decisions/`.
2. A decision crossing a repository boundary → `Jarvis/docs/decisions/`, and its
   normative sentence is added to `Jarvis/INVARIANTS.md` with an `INV-NNN`
   identifier.
3. Every invariant that applies to repository X is **quoted verbatim** in
   `X/CLAUDE.md` and `X/AGENTS.md`, together with its identifier and a pointer to
   the root authority.
4. A rozbor → `Jarvis/docs/deep/`, after a milestone, dated as a snapshot.

Rule 3 is deliberate duplication and requires justification. An agent editing
`assistant-runtime/src/delegation/` receives that repository's instruction file in
context automatically; it receives root `INVARIANTS.md` only if it decides to open
it — and that decision is precisely the one nobody made. A link is not in context.
A quoted sentence is.

Duplication is controlled rather than accidental: the root file is the sole
authority, the copy carries the identifier, and drift is mechanically detectable.

### Numbering

Existing numbering is inconsistent — `001-` in `memory-core` and `state-core`,
`0001-` in `intelligence-core`. Normalized to four digits everywhere. Numbers are
per-repository; the meta-repository has its own sequence.

## Enforcement

Nothing in this design is self-sustaining. Each layer needs a mechanism whose
failure is loud.

### Layer ranking is set by harness reach

This ecosystem is built by Claude Code and Codex together. Hooks live in
`settings.json` and fire only under Claude Code; Codex never sees them. A
mechanism that covers one harness cannot be the foundation of a rule that spans
both.

| Layer | Claude Code | Codex | Role |
| --- | --- | --- | --- |
| Structure test | Yes | Yes | **Foundation.** Survives harness changes entirely. |
| `CLAUDE.md` / `AGENTS.md` | Yes | Yes | Puts rules in context without a decision to read them |
| Skills | Yes | Yes, if ported | Knowledge, never obligation |
| Hooks | Yes | No | Improvement for one harness; never load-bearing |

### What can be tested, and what cannot

| Requirement | Checkable | Mechanism |
| --- | --- | --- |
| `CLAUDE.md` and `AGENTS.md` exist and are identical | Yes | Structure test |
| `docs/decisions/` exists and has a README | Yes | Structure test |
| ADR filenames are four digits, no gaps or duplicates | Yes | Structure test |
| ADR contains every required section | Yes | Structure test |
| Every invariant applying to repo X is quoted in X's instruction files | Yes — exact string match | Structure test |
| Inline code references resolve to a real document | Yes | Structure test |
| Files an ADR governs carry a back-reference to it | Yes, via *Enforced in* | Structure test |
| A specific invariant, once written | Yes, per invariant | Structure test |
| `ARCHITECTURE.md` genuinely explains a boundary | No | Human review |
| A decision that was made was actually recorded | No | Ritual; hook assists under Claude Code |

The invariant-citation check is load-bearing. Because each invariant has a stable
identifier and a fixed normative sentence, a test asserts that every repository
listed under it contains that exact sentence. Rule 3's duplication becomes
verifiable rather than a maintenance liability.

The last row is the one that produced the observed instance, and it has no test.
It is addressed by the skills below and, under Claude Code only, by a `Stop` hook.

### Inline references from code

An ADR is only reachable if the code it governs points at it. A reference is a
comment at the declaration it constrains, carrying the identifier and the path:

```ts
// INV-002: delegated capabilities are brokered, not declared in Host Tools.
// docs/decisions/0004-delegated-vs-host-capabilities.md
export function createMemorySearchTool(...) {
```

References belong at boundaries, constructors, and surprising code — not on every
function. A reference on ordinary code is noise that trains readers to skip all of
them.

#### Making the link mandatory in both directions

"Write a reference where one is needed" is not enforceable: the set of such places
is unbounded and only a human judges it. The obligation is therefore inverted and
moved to the ADR, where the scope is bounded and the author knows it at writing
time. Hence the required `Enforced in` section, which yields two mechanical checks:

1. **No dangling references.** Every `INV-NNN`, `ADR NNNN`, or `docs/decisions/…`
   mention in source resolves to a document that exists. Catches an ADR renamed or
   deleted while code still cites it.
2. **No unlinked enforcement.** Every file listed under an ADR's *Enforced in*
   contains that ADR's identifier in a comment. Catches the reference that was
   never written, and catches code moved out from under a decision.

Check 2 is the one that matters. It does not ask an agent to judge where a
reference belongs; it asks the ADR's author to name the files the decision governs
— a question with a definite answer at the moment of writing — and then holds the
code to it.

Accepted consequence: a decision with no `Enforced in` entries produces no inline
references. That is correct. Decisions constraining no specific location are
exactly the ones an inline comment cannot usefully mark.

### Mechanisms

1. **Structure test** in the meta-repository, run by `npm test`. Asserts the
   skeleton, instruction-file equality, ADR structure, invariant citations, and
   both reference directions. Requires no harness support.
2. **`agent-first-repository-builder` (amended)** — the created skeleton gains
   `CLAUDE.md`, `AGENTS.md`, and `docs/decisions/README.md`; foundation
   verification gains the structure test.
3. **`architectural-decisions` (new skill)** — holds the knowledge: how to
   recognise a decision, which placement rule applies, and how to write the ADR.
   Harness-neutral so Codex can use it.
4. **`decision-structure-audit` (new skill)** — read-only survey of every
   repository against the required shape, reporting gaps ranked for a human to act
   on. It is not the structure test: it runs before the test exists, and it covers
   the judgments the test cannot make — stubs that pass structurally while saying
   nothing, citations paraphrased away from their authority, and reasoning that is
   already written but stranded in a file where the question is never asked. It
   never writes, because an audit that fixes as it goes produces empty files that
   satisfy every check and hides the gap from the next audit.
5. **`SessionStart` and `Stop` hooks** — Claude Code only, explicitly an
   improvement rather than a foundation. `SessionStart` injects the invariant list
   before the first edit; `Stop` inspects the session's edits and raises an
   unrecorded decision before the session ends.

A skill cannot serve as the trigger. Skills are invoked by model judgment from
their description; tests and hooks fire on events. The judgment layer is exactly
the layer that failed, so it may carry knowledge but never the obligation.

### First invariants

The observed instance is not a violation, so it yields a taxonomy rather than a
prohibition. `INV-001` and `INV-002` are written only after the ADR that
establishes the distinction.

> **INV-001.** A capability that answers synchronously within its turn is declared
> in Host Tools and executed by Tool System. It is never given a second home.
>
> Applies to: `host-tools`, `tool-system`, `assistant-runtime`.

> **INV-002.** A capability that cannot answer within its turn is routed through
> the Delegation Broker, which mints its execution identity before work begins, so
> that a model holding the turn has something real to acknowledge and no gap to
> fill with an invented result.
>
> Applies to: `assistant-runtime`, `intelligence-core`.

The corresponding test asserts that every module exporting a tool declaration is
either inside `host-tools/` or reachable only through the Delegation Broker, and
that each carries the matching inline reference.

## Migration

Ordered so each step is useful before the next exists.

1. Write ADR `0001` in `Jarvis/docs/decisions/` recording the delegated-versus-host
   distinction, sourced from the `broker.ts` header and the Codex session.
2. Write `INVARIANTS.md` with `INV-001` and `INV-002` derived from that ADR.
3. Add `CLAUDE.md`, `AGENTS.md`, and `docs/decisions/README.md` to all eleven
   repositories, quoting the invariants that apply to each.
4. Normalize existing ADR numbering to four digits, guided by an audit run
   (`decision-structure-audit`) taken before step 3 so the gaps and any stranded
   reasoning are known before files are created.
5. Migrate existing rationale from `ARCHITECTURE.md` in `memory-core`,
   `aec-system`, and `assistant-runtime` into retroactive ADRs; narrow those files
   to shape.
6. Add the structure test.
7. Amend `agent-first-repository-builder`.
8. Write the `architectural-decisions` skill.
9. Add the `SessionStart` and `Stop` hooks.
10. Write the first rozbor for a completed milestone.

Steps 1–4 deliver value with no tooling. Step 6 is the first point at which
regression becomes impossible rather than merely discouraged.

## Explicit non-decisions

This design does not authorize relocating `PROGRESS.md`, `WORKPLAN.md`, or
`ISSUES.md`; replacing `ARCHITECTURE.md`; deleting existing documentation;
introducing a documentation generator or site; enforcing rozbory by any mechanism;
moving the delegation memory tools into Host Tools; or making either harness
authoritative over the other.
