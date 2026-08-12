# Development and Roadmap

Jarvis is large in vision and small in each implementation step.

## Development rules

- Define ownership and non-goals before implementation.
- Build vertical slices that produce a useful capability.
- Keep tests independent of internet, paid APIs, hardware, and one model provider whenever possible.
- Record important architectural decisions and their trade-offs.
- Verify typecheck, tests, failure paths, build, documentation, and repository hygiene before declaring a milestone complete.
- Do not extend a completed repository into a neighboring responsibility.

## Long-term sequence

```text
foundation
  → devices and voice
  → model and agent boundaries
  → permissions and tools
  → state and memory
  → automation and background tasks
  → multi-room context
  → reliability and security hardening
```

The sequence is directional, not permission to implement every imagined future feature. A working vertical slice should be used long enough to expose real constraints before adding speculative complexity.
