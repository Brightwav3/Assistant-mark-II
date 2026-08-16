# Ecosystem decisions

Architecture Decision Records for choices that cross a repository boundary.

A decision belongs here when its reasoning constrains code in two or more
repositories. A decision contained within one repository belongs in that
repository's own `docs/decisions/`.

Every ADR here that can be stated as a rule also gets an entry in
[`INVARIANTS.md`](../../INVARIANTS.md), quoted verbatim into the instruction files
of each repository it governs. Write the ADR first and the invariant second — a
rule written before the case is examined forbids work that turned out to be
correct.

## When to write one

Write an ADR when **any** of these is true. These are observable facts about the
work, not judgments, and that is deliberate — *"was this important enough"* is the
question that fails.

1. **You explained a choice to someone.** If you were asked *why did you do it that
   way* and your answer ran longer than a sentence, that answer is an ADR. This is
   the strongest trigger: an explanation good enough to satisfy a person is good
   enough to save.
2. **You chose between two places a thing could live.** Two plausible homes means
   the next agent meets the same fork and may pick differently.
3. **You created a second home for a kind of file that already exists elsewhere.**
4. **Your change touched two or more repositories.** Cross-boundary decisions have
   no local owner, which is why they go missing.
5. **You rejected an approach a reasonable next agent would try.** If you can name
   what you did not do and why, *Rejected alternatives* is already written.
6. **You created a new directory under `src/`.**

If none of these hold, do not write one. A directory of forty records where five
carry real decisions is read by nobody.

**Scope decides location.** Inside one repository → that repository's
`docs/decisions/`. Across a boundary → here, plus a sentence in
[`INVARIANTS.md`](../../INVARIANTS.md) quoted verbatim into every governed
repository's `CLAUDE.md` **and** `AGENTS.md`.

**Write the ADR before the invariant.** A rule invented before the case is examined
forbids work that turned out to be correct — that is not hypothetical here, it
nearly deleted the delegation broker's protection against hallucinated results.

## Format

```
NNNN-slug.md          four digits, no gaps, no duplicates
```

Required sections: `Context`, `Decision`, `Rejected alternatives`,
`Consequences`, `Enforced in`, `Explicit non-decisions`.

`Rejected alternatives` is what stops the next agent from re-deriving a discarded
option and believing it found something new. `Explicit non-decisions` is what
stops it from stretching the decision to a case this one never examined. An ADR
missing either is incomplete, not merely short.

Every path under `Enforced in` carries a comment at the declaration it constrains,
naming this ADR. The obligation runs from the ADR to the code: you are not asked
to judge where a reference belongs, only to name the files your decision governs.

## Index

- [0001 — A capability's home is decided by whether it can answer within its turn](0001-capability-homes.md)
- [0002 — A late result from a superseded attempt is dropped, not delivered](0002-authority-generation.md)
- [0003 — A delegated tool failure cannot produce a completed result](0003-delegation-tool-failures-remain-failed.md)
