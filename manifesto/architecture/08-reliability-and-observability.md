# Reliability and Observability

A five-minute demo is not a continuously operating assistant.

Important components should support:

- health and capability reporting;
- bounded retries and reconnects;
- timeouts and cancellation;
- stale-result protection;
- graceful degradation;
- deterministic startup and reverse-order shutdown;
- recovery after provider or device failure;
- structured operation traces with safe redaction.

The always-on path should stay cheap. Expensive models and providers should run when intelligence is needed, not continuously while the assistant is idle.

Observability exists to explain what happened. It must not become an excuse to permanently collect everything the system can see or hear.
