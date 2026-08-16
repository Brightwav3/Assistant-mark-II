# ADR 0003 — A delegated tool failure cannot produce a completed result

## Context

The delegated model may call a mutating tool and then return a syntactically valid
`delegation.result.v1` object even when that tool refused the request. The memory
runtime correctly rejected a non-explicit save request, but the voice model was
still able to receive a completed-looking result and claim that the memory had
been stored. It could also make the misleading acknowledgement before the
background result arrived.

The action loop and the assistant runtime are separate repositories. The runtime
therefore needs the parent request identity at the Tool System boundary in order
to associate a tool error with the delegation that owns it.

## Decision

`ActionRuntime` carries the parent Intelligence request id on every Tool System
request. Assistant Runtime records non-successful tool outcomes by that id, and
the Delegation Broker validates the completed result against those outcomes before
publishing `delegation.completed`. If any tool in the request failed, the broker
publishes one bounded `delegation.failed` event and the result is never delivered
as completed conversation context. An obvious memory-write delegation whose
current utterance lacks an explicit remember trigger is refused before background
work starts, so even the initial acknowledgement cannot imply a successful save.

## Rejected alternatives

- **Relying only on a stronger model instruction** was rejected because the hardware
  trace already showed the model claiming success after an explicit tool error.
- **Turning tool errors into successful JSON statuses** was rejected because it hides
  an operational failure from Tool System and the human diagnostic console.
- **Correlating failures by timestamps or tool-call ids** was rejected because neither
  is a stable parent identity under concurrent delegations.

## Consequences

- A malformed or refused mutating operation cannot be narrated as successful.
- The Tool System remains the owner of validation and refusal; the broker only
  preserves the terminal status across the model boundary.
- The Intelligence Core Tool request contract gains one optional parent request id;
  existing Tool Clients may ignore it.
- A delegation containing a failed tool is bounded by `DELEGATION_TOOL_FAILED` and
  is not delivered to the voice session.

## Enforced in

- `intelligence-core/src/agent/action-runtime.ts`
- `intelligence-core/src/tools/tool-client.ts`
- `assistant-runtime/src/tool-bridge.ts`
- `assistant-runtime/src/delegation/broker.ts`
- `assistant-runtime/src/delegation/composition.ts`
- `assistant-runtime/src/delegation/intelligence-tool.ts`

## Explicit non-decisions

- This ADR does not change which tools are allowed or how memory validates an
  explicit trigger.
- This ADR does not make every model response synchronous or remove delegated
  acknowledgements.
- Provider adapters do not receive or interpret the parent request id beyond the
  provider-neutral action boundary.
