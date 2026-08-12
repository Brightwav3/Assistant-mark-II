# Headless and Agent-First Contracts

The primary architecture is machine-facing. A UI may consume Jarvis, but core capabilities must not depend on one.

## Prefer

- typed schemas with runtime validation;
- stable identifiers and versioned contracts;
- structured errors with safe messages;
- capability and health discovery;
- explicit side effects, timeouts, cancellation, and progress;
- JSON, JSONL, library, HTTP, WebSocket, or event interfaces.

## Avoid

- UI scraping as a required integration;
- decorative CLI tables as the only output;
- prose-only errors;
- hidden global state;
- guessed parameter names or undocumented side effects.

Headless behavior should be the easiest path to test and compose. Human interfaces can be added on top of that foundation.
