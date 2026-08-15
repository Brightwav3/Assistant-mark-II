# Harness setup

This ecosystem is built by more than one agent harness. What holds the
documentation together must therefore not depend on any one of them.

## What each harness reads and runs

| | Claude Code | Codex | A person typing `git commit` |
| --- | --- | --- | --- |
| Instruction file | `CLAUDE.md` | `AGENTS.md` | — |
| Structure test (`npm test`) | ✅ | ✅ | ✅ |
| Git `pre-commit` hook | ✅ | ✅ | ✅ |
| CI job | ✅ | ✅ | ✅ |
| `Stop` hook | ✅ | ❌ no equivalent | ❌ |
| Skills | ✅ | ❌ no equivalent | ❌ |

The last two rows are why the gate is not a hook. **Claude Code's `Stop` hook is a
convenience that catches a mistake earlier; the git hook and CI are what actually
hold the line.**

## One-time setup, per machine

```bash
git config core.hooksPath .githooks
```

That is the whole setup. `.githooks/pre-commit` runs the structure test and
refuses the commit if it fails — for every harness, and for you.

`core.hooksPath` is per-clone and is not carried in the repository, so it has to be
run once wherever this is cloned. Nothing else is required: the test has no
dependencies and no install step.

## What the instruction files carry

`CLAUDE.md` and `AGENTS.md` are **byte-identical** in all sixteen units. The
structure test compares them, so a change to one without the other fails the
commit. This duplication is deliberate — see the *Rule 3* discussion in
[the design spec](design/2026-08-15-decision-documentation-system.md).

Neither file references a Claude Code skill. Everything an agent needs — the six
triggers for writing a decision record, the placement rules, the template — lives
in [`docs/decisions/README.md`](decisions/README.md), which any harness can read.

## For a Codex session

Codex loads `AGENTS.md` automatically. It has no hook mechanism, so nothing runs
the structure test for it. The instruction file therefore says so explicitly, in
its *Before you finish* section:

> Run `npm test` in this directory.

That is prose, and prose is exactly the layer this ecosystem has already watched
fail — which is why the commit is also gated. A Codex session that forgets is
caught by `pre-commit`; a `--no-verify` commit is caught by CI.

## For a Claude Code session

`.claude/settings.json` adds a `Stop` hook running
`.claude/hooks/structure-gate.mjs`, which blocks the end of a session while the
test is failing. It adds no check of its own — it only moves the failure earlier.

The hook guards against looping: if it has already blocked once this turn
(`stop_hook_active`), it stays quiet rather than trapping a model that cannot fix
the failure.

A newly created `.claude/` directory is not picked up mid-session. After cloning,
open `/hooks` once or restart.

## In CI

The `documentation-structure` job in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs `npm test` on
Ubuntu. It needs no submodule build, no ffmpeg, and no install.

**Both other jobs declare `needs: documentation-structure`**, so they do not start
until it passes. Listing a job first in the file changes nothing — GitHub Actions
runs jobs in parallel unless something says otherwise, and without the gate a
structure failure would sit behind a full Windows build with a `winget` ffmpeg
install and every submodule compiled. With it, the failure surfaces in under a
minute and nothing expensive is spent.

The cost of the gate is that the integration job waits for the check rather than
starting alongside it. That is seconds against many minutes.

It is also the only layer that catches a case-only filename mistake: `workplan.md`
versus `WORKPLAN.md` is invisible on Windows and is a missing file on Linux.

## Adding a third harness

Give it `AGENTS.md` if it reads that convention, or add its filename to the
instruction-pair check in `tests/structure.test.mjs`. Do not port the `Stop` hook —
the git hook already covers anything that commits.
