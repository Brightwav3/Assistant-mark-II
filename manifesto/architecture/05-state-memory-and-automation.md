# State, Memory, and Automation

These are different systems and must not be collapsed into one vague context store.

## State

State represents current facts:

- source and provenance;
- observation and update time;
- confidence;
- revision and stale-writer protection;
- freshness and expiration;
- queries, snapshots, and subscriptions.

State is not authorization and does not infer truth from raw observations.

## Memory

Memory represents deliberate durable knowledge retained across sessions. It should have explicit provenance, scope, confidence, lifecycle, retrieval, and forgetting behavior.

Raw audio and full conversation archives are not automatic memory. Conversation summaries may be stored by a host runtime, while intelligent preference/fact extraction requires an explicit policy and verification.

## Automation

Deterministic triggers, conditions, and actions should run independently of a model. AI may propose an automation; it must not silently become the automation engine.
