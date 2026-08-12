# Jarvis Manifesto

This directory is the maintained split version of the Jarvis project manifesto and architecture.

## Read first

1. [Manifesto](./MANIFESTO.md) — the short, durable statement of what Jarvis is and what it should protect.
2. [Architecture index](./architecture/README.md) — the architectural principles, boundaries, and ownership map.
3. [Current baseline](./architecture/current-baseline.md) — the verified implementation state and known gaps.

## Why this exists

The root [README AGENTS.md](../README%20AGENTS.md) is intentionally kept as the complete combined reference. It contains the manifesto, implementation baseline, architecture, and long-term roadmap in one file.

The files here separate those concerns:

- The manifesto changes rarely.
- Architecture documents explain one boundary or principle at a time.
- The current baseline changes when the code changes.

New work should read the short manifesto and the relevant architecture files first. Use `README AGENTS.md` when the complete historical context is needed.

## Maintenance rule

When a significant architectural decision changes, update the smallest relevant architecture file and then reconcile `README AGENTS.md` and `current-baseline.md`. Do not put temporary implementation status into the manifesto itself.
