#!/usr/bin/env node
/**
 * Stop-hook gate for the documentation structure test.
 *
 * The test in tests/structure.test.mjs is the layer that keeps 39 decision
 * records and 16 instruction-file pairs honest. This hook does not add a single
 * check to it — it only moves the moment of failure from "whenever somebody runs
 * npm test" to "before this session is allowed to end".
 *
 * Deliberately Claude-Code-only. Codex never fires hooks, which is exactly why
 * the test itself must stay the foundation and this must stay a convenience.
 * See docs/design/2026-08-15-decision-documentation-system.md.
 *
 * Written in Node rather than shell so it behaves identically on Windows without
 * depending on which shell the harness picked.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TESTS = join(REPO, "tests");

let input = {};
try {
  const { readFileSync } = await import("node:fs");
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  // No stdin, or not JSON. Treat as a normal stop and run the gate.
  input = {};
}

// Already blocked once this turn. Blocking again on the same failure would loop
// a model that cannot fix it, which is worse than letting the session end with
// the failure visible.
if (input.stop_hook_active) process.exit(0);

if (!existsSync(TESTS)) process.exit(0);

const files = readdirSync(TESTS)
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => join(TESTS, f));

if (files.length === 0) process.exit(0);

const run = spawnSync(process.execPath, ["--test", ...files], {
  cwd: REPO,
  encoding: "utf8",
});

if (run.status === 0) process.exit(0);

// Only the failing assertions are useful here. The runner also prints stack
// frames and full `actual:` dumps — an instruction file's entire contents, in the
// drift case — which bury the one sentence that says what to fix.
const NOISE = /^\s*(actual|expected|operator|code|generatedMessage|diff|at\s):/;
const SIGNAL = /^(✖|not ok|\s+AssertionError|\s{4}[+-]?\s*['"]?[\w .\/-]+ → |\s{4}[a-z-]+\/\S+\.md)/;

const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
const seen = new Set();
const failures = output
  .split("\n")
  .filter((line) => SIGNAL.test(line) && !NOISE.test(line))
  .map((line) => line.replace(/\s+\(\d+\.\d+ms\)$/, "").trimEnd())
  .filter((line) => (seen.has(line) ? false : seen.add(line)))
  .slice(0, 40)
  .join("\n");

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason:
      "The documentation structure test is failing. Fix it before finishing.\n\n" +
      `${failures || output.slice(0, 3000)}\n\n` +
      "Run `npm test` in C:/Users/Sajmon/Jarvis for the full output.\n" +
      "Common causes: CLAUDE.md edited without copying to AGENTS.md; a new ADR " +
      "missing a required section; a file named under an ADR's `Enforced in` " +
      "without a comment naming that ADR; an invariant quoted with different wording " +
      "than INVARIANTS.md.",
    systemMessage: "Structure test failed — blocking session end.",
  }),
);
process.exit(0);
