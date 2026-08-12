# Tools and External Systems

Jarvis should own stable capability abstractions while allowing external systems to remain the source of truth.

## Tool shape

A tool should declare:

- name and version;
- operations and schemas;
- permissions and risk class;
- health and capability information;
- structured results and errors.

Prefer capability-oriented tools over one enormous computer-control tool.

## Integrations

Use adapters for calendars, mail, files, GitHub, smart-home systems, browsers, and future devices. The assistant should reason over meaningful concepts while adapters translate to provider-specific identifiers.

An external integration may fail, change, or disappear. The rest of Jarvis should degrade predictably rather than making the external provider the architecture.
