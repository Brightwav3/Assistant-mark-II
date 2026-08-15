/**
 * The structure test.
 *
 * This ecosystem's recurring failure is not missing documentation — every
 * repository already had five documents. It is reasoning filed where the question
 * is never asked, and rules that hold only while somebody remembers them.
 *
 * Everything asserted here is mechanical. What cannot be mechanised — whether an
 * ADR actually explains anything — is left to review, deliberately, rather than
 * approximated by a word count.
 *
 * It is plain ESM with no dependencies and runs under `node --test`, so it works
 * for any agent and any harness. Hooks cover one harness; this covers both.
 *
 * Ecosystem ADR 0001 — docs/decisions/0001-capability-homes.md
 * Ecosystem ADR 0002 — docs/decisions/0002-authority-generation.md
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Directories never walked. `node_modules` alone holds 362 foreign Markdown files. */
const SKIP = new Set(["node_modules", "dist", "build", ".git", ".worktrees", "tmp", ".runtime"]);

/** Every unit is expected to exist. A drop in this number means discovery broke, not that a unit left. */
const EXPECTED_UNIT_COUNT = 16;

const REQUIRED_ADR_SECTIONS = [
  "## Context",
  "## Decision",
  "## Rejected alternatives",
  "## Consequences",
  "## Enforced in",
  "## Explicit non-decisions",
];

/* ------------------------------------------------------------------ *
 * Discovery
 * ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      walk(join(dir, entry.name), out);
    } else {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/**
 * A unit is any directory carrying a CLAUDE.md, plus the root.
 *
 * Discovery walks the tree rather than globbing. Three units live under directory
 * names containing spaces — "realtime core", "scribe core", "voice core" — and an
 * unquoted glob skips all three silently, which reads as coverage.
 */
function findUnits() {
  const units = [];
  const visit = (dir) => {
    if (existsSync(join(dir, "CLAUDE.md"))) units.push(dir);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
      visit(join(dir, entry.name));
    }
  };
  visit(ROOT);
  return units;
}

const UNITS = findUnits();
const name = (unit) => relative(ROOT, unit) || ".";

/** Exact bytes. Only the instruction-pair comparison wants this. */
const readRaw = (p) => readFileSync(p, "utf8");

/**
 * Content with line endings normalised.
 *
 * Everything here that parses Markdown must go through this. In a JavaScript
 * regular expression `\r` is a line terminator, so `.` does not match it — and a
 * pattern like /^>.*(?:\n>.*)*\/m silently captures only the first line of a
 * blockquote in a CRLF checkout. That is not hypothetical: with core.autocrlf on,
 * a fresh clone on Windows turned a four-line invariant into a 77-character
 * fragment and the citation checks failed against documentation that was correct.
 */
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** Blockquote text, normalised for comparison: markers stripped, whitespace collapsed. */
function quoteText(block) {
  return block
    .split("\n")
    .map((line) => line.replace(/^\s*>\s?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function adrFiles(unit) {
  const dir = join(unit, "docs", "decisions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d+.*\.md$/.test(f))
    .sort()
    .map((f) => join(dir, f));
}

/* ------------------------------------------------------------------ *
 * Discovery integrity
 * ------------------------------------------------------------------ */

test("every unit is discovered, including the ones whose paths contain spaces", () => {
  assert.equal(
    UNITS.length,
    EXPECTED_UNIT_COUNT,
    `Found ${UNITS.length} units, expected ${EXPECTED_UNIT_COUNT}:\n  ${UNITS.map(name).join("\n  ")}`,
  );
  for (const expected of ["speech-system/realtime core", "speech-system/scribe core", "speech-system/voice core"]) {
    assert.ok(
      UNITS.some((u) => name(u).replace(/\\/g, "/") === expected),
      `${expected} was not discovered — a path with a space was dropped`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * Instruction files
 * ------------------------------------------------------------------ */

test("CLAUDE.md and AGENTS.md exist and are byte-identical in every unit", () => {
  for (const unit of UNITS) {
    const claude = join(unit, "CLAUDE.md");
    const agents = join(unit, "AGENTS.md");
    assert.ok(existsSync(agents), `${name(unit)}: AGENTS.md missing — Codex reads that one, not CLAUDE.md`);
    // Byte-exact on purpose: this is the one check that must not normalise, because
    // a pair that differs only in line endings is still a pair that will drift.
    assert.equal(
      readRaw(claude),
      readRaw(agents),
      `${name(unit)}: CLAUDE.md and AGENTS.md differ. Both files look present while one lies; ` +
        `that is worse than one being absent.`,
    );
  }
});

test("an instruction file stays short enough to be read as instruction", () => {
  for (const unit of UNITS) {
    const lines = read(join(unit, "CLAUDE.md")).split("\n").length;
    assert.ok(
      lines <= 140,
      `${name(unit)}/CLAUDE.md is ${lines} lines. An instruction file that long is not read as ` +
        `instruction — move the narrative to docs/deep/.`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * Decision directories
 * ------------------------------------------------------------------ */

test("every unit has docs/decisions with a README", () => {
  for (const unit of UNITS) {
    const readme = join(unit, "docs", "decisions", "README.md");
    assert.ok(
      existsSync(readme),
      `${name(unit)}: docs/decisions/README.md missing. An empty decisions directory still ` +
        `instructs; a missing one says decisions are not recorded here.`,
    );
  }
});

test("ADR numbering is four digits, without gaps or duplicates", () => {
  for (const unit of UNITS) {
    const files = adrFiles(unit);
    const seen = new Map();
    for (const file of files) {
      const base = basename(file);
      const match = /^(\d+)-/.exec(base);
      assert.ok(match, `${name(unit)}/${base}: expected NNNN-slug.md`);
      assert.equal(match[1].length, 4, `${name(unit)}/${base}: numbering must be four digits`);
      const n = Number(match[1]);
      assert.ok(!seen.has(n), `${name(unit)}: ADR ${match[1]} is duplicated by ${base} and ${seen.get(n)}`);
      seen.set(n, base);
    }
    const numbers = [...seen.keys()].sort((a, b) => a - b);
    numbers.forEach((n, i) => {
      assert.equal(n, i + 1, `${name(unit)}: ADR numbering has a gap at ${String(i + 1).padStart(4, "0")}`);
    });
  }
});

test("every ADR carries all six required sections", () => {
  for (const unit of UNITS) {
    for (const file of adrFiles(unit)) {
      const body = read(file);
      for (const section of REQUIRED_ADR_SECTIONS) {
        assert.ok(
          body.includes(section),
          `${name(unit)}/${basename(file)}: missing "${section}".\n` +
            `  Rejected alternatives stops the next agent re-deriving a discarded option.\n` +
            `  Explicit non-decisions stops it stretching this one to a case it never examined.`,
        );
      }
    }
  }
});

test("Rejected alternatives names at least one alternative", () => {
  for (const unit of UNITS) {
    for (const file of adrFiles(unit)) {
      const body = read(file);
      const section = body.split("## Rejected alternatives")[1]?.split(/\n## (?!#)/)[0] ?? "";
      const named = /^###\s+\S/m.test(section) || /^-\s+\*\*/m.test(section);
      assert.ok(
        named,
        `${name(unit)}/${basename(file)}: "Rejected alternatives" names none. ` +
          `A section that passes structurally and says nothing is worse than an absent one.`,
      );
    }
  }
});

/* ------------------------------------------------------------------ *
 * Invariants
 * ------------------------------------------------------------------ */

/** Parses INVARIANTS.md into { id, sentence, governs[] }. */
function parseInvariants() {
  const body = read(join(ROOT, "INVARIANTS.md"));
  const blocks = body.split(/\n## (?=INV-)/).slice(1);
  return blocks.map((block) => {
    const id = /^(INV-\d+)/.exec(block)[1];
    const quote = block.match(/(^>.*(?:\n>.*)*)/m);
    assert.ok(quote, `${id}: has no normative sentence as a blockquote`);
    const governs = (/\*\*Governs:\*\*(.*)/.exec(block)?.[1] ?? "")
      .split(",")
      .map((s) => s.replace(/`/g, "").trim())
      .filter(Boolean);
    return { id, sentence: quoteText(quote[1]), governs };
  });
}

const INVARIANTS = parseInvariants();

test("INVARIANTS.md parses, and every invariant names the repositories it governs", () => {
  assert.ok(INVARIANTS.length > 0, "no invariants found");
  for (const inv of INVARIANTS) {
    assert.ok(inv.sentence.length > 40, `${inv.id}: normative sentence looks empty`);
    assert.ok(inv.governs.length > 0, `${inv.id}: governs nothing — an invariant with no scope is not enforceable`);
    for (const repo of inv.governs) {
      assert.ok(existsSync(join(ROOT, repo)), `${inv.id}: governs "${repo}", which does not exist`);
    }
  }
});

test("every governed unit quotes its invariants verbatim", () => {
  for (const inv of INVARIANTS) {
    for (const repo of inv.governs) {
      const file = join(ROOT, repo, "CLAUDE.md");
      const quotes = (read(file).match(/(^>.*(?:\n>.*)*)/gm) ?? []).map(quoteText);
      assert.ok(
        quotes.includes(inv.sentence),
        `${repo}/CLAUDE.md does not quote ${inv.id} verbatim.\n` +
          `  A link is not in context; a quoted sentence is. Copy the sentence from INVARIANTS.md exactly.`,
      );
    }
  }
});

test("a unit that mentions an invariant quotes it verbatim, even if not governed", () => {
  for (const unit of UNITS) {
    const body = read(join(unit, "CLAUDE.md"));
    const quotes = (body.match(/(^>.*(?:\n>.*)*)/gm) ?? []).map(quoteText);
    for (const inv of INVARIANTS) {
      if (!body.includes(`**${inv.id}`)) continue;
      assert.ok(
        quotes.includes(inv.sentence),
        `${name(unit)}/CLAUDE.md carries ${inv.id} but the wording has drifted from INVARIANTS.md.\n` +
          `  A paraphrase means the copy was edited and the authority has silently forked.`,
      );
    }
  }
});

/* ------------------------------------------------------------------ *
 * References, both directions
 * ------------------------------------------------------------------ */

const SOURCE_EXT = new Set([".ts", ".js", ".mjs", ".cjs"]);

/** The unit a file belongs to: the deepest unit directory containing it. */
function owningUnit(file) {
  return UNITS.filter((u) => file.startsWith(u + "\\") || file.startsWith(u + "/")).sort(
    (a, b) => b.length - a.length,
  )[0];
}

test("no source file references a decision record that does not exist", () => {
  const missing = [];
  for (const file of walk(ROOT)) {
    if (!SOURCE_EXT.has(extname(file))) continue;
    const body = read(file);
    for (const [, raw] of body.matchAll(/([\w .\/-]*docs\/decisions\/\d{4}-[a-z0-9-]+\.md)/g)) {
      const ref = raw.trim();
      // A reference may be written relative to the file, to its repository root
      // (the common case, matching how a reader would type the path), or to the
      // meta-repository. All three are legitimate; only resolving to nothing is not.
      const unit = owningUnit(file);
      const candidates = [join(dirname(file), ref), unit ? join(unit, ref) : null, join(ROOT, ref)].filter(Boolean);
      if (!candidates.some(existsSync)) missing.push(`${relative(ROOT, file)} → ${ref}`);
    }
  }
  assert.deepEqual(missing, [], `Dangling decision references:\n  ${missing.join("\n  ")}`);
});

test("every file an ADR governs carries a back-reference to it", () => {
  const unlinked = [];
  for (const unit of UNITS) {
    for (const adr of adrFiles(unit)) {
      const section = read(adr).split("## Enforced in")[1]?.split(/\n## (?!#)/)[0] ?? "";
      for (const [, path] of section.matchAll(/^-\s+`([^`]+)`/gm)) {
        const target = join(unit, path);
        if (!existsSync(target)) {
          unlinked.push(`${name(unit)}/${basename(adr)} → ${path} (does not exist)`);
          continue;
        }
        // A comment can only be required where comments are possible.
        if (!SOURCE_EXT.has(extname(target))) continue;
        if (!read(target).includes(basename(adr))) {
          unlinked.push(`${name(unit)}/${basename(adr)} → ${path} (no back-reference)`);
        }
      }
    }
  }
  assert.deepEqual(
    unlinked,
    [],
    `Files listed under "Enforced in" without a back-reference:\n  ${unlinked.join("\n  ")}\n\n` +
      `  Add a comment naming the ADR's filename at the declaration it constrains.\n` +
      `  The obligation runs from the ADR to the code: you named these files, so they must say so.`,
  );
});

/* ------------------------------------------------------------------ *
 * Genre discipline
 * ------------------------------------------------------------------ */

test("docs/deep is never the only home for a decision", () => {
  const deep = join(ROOT, "docs", "deep");
  if (!existsSync(deep)) return;
  for (const file of readdirSync(deep)) {
    if (file === "README.md") continue;
    assert.ok(
      /^\d{4}-\d{2}-\d{2}-/.test(file),
      `docs/deep/${file}: a rozbor is a dated snapshot — name it YYYY-MM-DD-topic.md`,
    );
  }
});
