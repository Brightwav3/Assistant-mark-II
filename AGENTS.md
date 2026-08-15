# Jarvis / M.A.R.K. II — rules for agents

This file is loaded automatically. It carries rules, not description.

`AGENTS.md` is a byte-identical copy of this file. Change both or change neither.

This is the meta-repository. The code lives in submodules; **each one has its own
`CLAUDE.md` and `AGENTS.md`, and those are the authority for working inside it.**
Read the one belonging to the directory you are editing.

## Where things are written

| You want | Read |
| --- | --- |
| The rules for a repository | that repository's `CLAUDE.md` / `AGENTS.md` |
| Rules that cross repository boundaries | [`INVARIANTS.md`](INVARIANTS.md) |
| Why a boundary is the way it is | that repository's `docs/decisions/` |
| Why a cross-repository boundary is the way it is | [`docs/decisions/`](docs/decisions/README.md) |
| What is being built right now | [`docs/workstreams/`](docs/workstreams/README.md) |
| What the whole system is for | [`manifesto/`](manifesto/README.md) |
| The full architectural narrative | [`README AGENTS.md`](README%20AGENTS.md) |
| Long-form reconstruction, for a human | [`docs/deep/`](docs/deep/README.md) |

**`README AGENTS.md` is the manifesto in full, and `manifesto/` is derived from
it.** It is a *rozbor* — long-form, for a human reading voluntarily — not an
instruction file, despite its name. This short file is what an agent loads.

## The governing principle

> **Never make the current AI model the architecture.**

The model is a component. Jarvis is the system. Every rule below follows from that
sentence, and the manifesto argues for it at length.

## Rules across every repository

1. **No runtime contract, event name, header, or identifier embeds an assistant
   name, model, or provider.** Renaming the assistant must require no code change.
2. **No core imports another core.** Where two vocabularies meet, exactly one file
   in Assistant Runtime knows both and translates thinly. See
   [assistant-runtime ADR 0001](assistant-runtime/docs/decisions/0001-zero-imports-between-cores.md).
3. **Device ownership stays in the leaves.** A component doing interesting work does
   not acquire platform code.
4. **Fakes are deterministic and need no device, network, account, or key.** A test
   requiring hardware is not a test this ecosystem can run.
5. **A native dependency needs measured evidence, not an expectation.**
6. **Never claim a capability the code does not have.** Overstating one in a README
   is a correctness bug: downstream components calibrate against the claim.
7. **Never persist raw audio.**
8. **Refusing defaults.** A boundary that is unconfigured denies rather than
   permits, and says why.

The full, numbered cross-boundary rules are in [`INVARIANTS.md`](INVARIANTS.md).
Each is quoted verbatim into the instruction files of the repositories it governs;
a structure test compares them.

## Writing decisions down

This ecosystem's recurring failure is not missing documentation — every repository
has five documents. It is reasoning filed where the question is never asked. Four
genres, one job each:

| Genre | Audience | Job |
| --- | --- | --- |
| `CLAUDE.md` / `AGENTS.md` | agent, auto-loaded | what must not be done here |
| `INVARIANTS.md` | agent, structure test | the cross-repository rules |
| `docs/decisions/` | agent, on demand | **why** it is shaped that way |
| `docs/deep/` | human, voluntarily | how to understand and rebuild it |

`ARCHITECTURE.md` describes **shape only**. Reasoning goes in `docs/decisions/`,
because an empty decisions directory is visible and a missing paragraph is not.

**Write the ADR before the invariant.** A rule invented before the case is examined
forbids work that turned out to be correct.

## Before you finish

**Run `npm test` in this directory.** It asserts the structure above — instruction
pairs identical, ADR sections present, invariants quoted verbatim, every file an
ADR governs carrying a back-reference. It takes under a second and needs no
install.

This matters more under Codex than under Claude Code: Claude Code has a Stop hook
that runs it for you, and Codex has no equivalent. A git `pre-commit` hook and a CI
job cover both, but the earliest you can catch a mistake is here.

First clone on a machine: `git config core.hooksPath .githooks`
Full per-harness setup: [`docs/HARNESS-SETUP.md`](docs/HARNESS-SETUP.md)

- Changed a boundary, chose between two homes for something, or rejected an
  approach a next agent would try? Write an ADR. The six triggers and the template
  are in [`docs/decisions/README.md`](docs/decisions/README.md).
- Scope decides location: inside one repository → that repository. Across a
  boundary → [`docs/decisions/`](docs/decisions/README.md) **and** a sentence in
  `INVARIANTS.md`, quoted verbatim into every governed repository.
- Wrote an ADR? Add its identifier as a comment in every file under its
  `Enforced in`.
- Edited a `CLAUDE.md`? Copy it to `AGENTS.md` in the same change. They must stay
  byte-identical — Claude Code reads one, Codex reads the other.
- Produced a number? Assert it in a test, so it cannot quietly stop being true.
