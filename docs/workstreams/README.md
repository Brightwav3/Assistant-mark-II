# Workstreams

A workstream is a named body of work that spans several repositories and has its
own contract, plan, and changelog. Each gets a directory here.

Before this existed, workstream documents lived at the repository root and were
distinguished by a suffix — `WORKPLAN.md` next to `WORKPLAN-session-handoff.md`,
`CHANGELOG.md` next to `CHANGELOG-session-handoff.md`. Nothing said which was
current, which belonged to which effort, or what the suffix meant. Nine of the ten
root Markdown files were linked from nowhere.

Naming the convention in a README would have fixed today's confusion and let the
next workstream recreate it. A directory per workstream removes the question.

## Layout

```
docs/workstreams/<name>/
  WORKPLAN.md     the contract — what will be built
  PLAN.md         implementation plan, if one exists
  CHANGELOG.md    what landed, in order
  HANDOFF-*.md    session handoffs, dated
```

Only `WORKPLAN.md` is required. Add the rest when the workstream needs them.

## What does not belong here

| Document | Belongs in |
| --- | --- |
| A repository's own `WORKPLAN.md` / `PROGRESS.md` | that repository's root |
| Why a boundary is shaped a certain way | `docs/decisions/` or the repository's own |
| A rule an agent must follow | `CLAUDE.md` / `AGENTS.md`, or `INVARIANTS.md` |
| Long-form narrative for a human | [`docs/deep/`](../deep/README.md) |

A workstream document says *what is being built and where it got to*. It is not a
place to record why a boundary exists — that reasoning would be unreachable to
anyone not working on this workstream, which is the failure this ecosystem's
decision records exist to prevent.

## Finishing a workstream

Leave the directory in place. It is the record of what happened. Move any reasoning
that outlives the work into an ADR first — a workstream nobody is working on is a
directory nobody opens.

## Active

- [**delegated-voice-intelligence**](delegated-voice-intelligence/WORKPLAN.md) —
  a half-duplex realtime voice session that feels like one assistant while a voice
  model and a delegation model work together.
- [**session-handoff**](session-handoff/WORKPLAN.md) — session handoff and live
  context compaction for a long-running realtime voice session.
