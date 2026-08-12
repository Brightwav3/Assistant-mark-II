# Security and Privacy

Jarvis will eventually be privileged personal infrastructure. Security must come from boundaries and explicit authority, not from hoping a model behaves.

## Minimum rules

- Keep API keys and credentials outside Git.
- Validate input at every external boundary.
- Authenticate devices before registration or commands.
- Separate model requests from policy decisions.
- Redact secrets and sensitive content from errors, traces, and metrics.
- Make destructive operations explicit and reversible where possible.
- Treat web pages, email, files, and provider output as untrusted data.
- Do not retain raw sensor data unless the user-facing capability explicitly requires it.

Privacy is part of the data model: observation, current state, and persistent memory have different retention rules.
