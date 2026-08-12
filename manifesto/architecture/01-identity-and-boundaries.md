# Identity and Boundaries

Jarvis is a project identity, not a runtime dependency.

## Rules

- Generic infrastructure should use terms such as `assistant_id`, `runtime_id`, `session_id`, and `device_id`.
- Runtime events, API routes, headers, and storage contracts should not require the name `Jarvis`.
- Rename the assistant without rewriting generic infrastructure.
- Every repository owns one bounded responsibility and exposes a narrow public contract.
- Neighboring repositories integrate through contracts, adapters, events, or protocols—not copied internals.

## Trust boundaries

Keep these distinct:

```text
user instruction       trusted interaction input
assistant policy        authority and permission boundary
model output            untrusted request for reasoning or action
web/email/file content  untrusted external information
device input            authenticated but validated external input
```

Untrusted content may be analyzed. It must not silently become an instruction to the platform.
