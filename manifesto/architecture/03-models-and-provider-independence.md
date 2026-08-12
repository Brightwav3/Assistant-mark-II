# Models and Provider Independence

Models provide replaceable reasoning. They do not define Jarvis's identity, storage, permissions, tools, or device protocols.

## Model boundary

The model layer should expose:

- normalized requests and responses;
- provider capabilities;
- cancellation and timeouts;
- structured, provider-neutral errors;
- usage and cost metadata where available;
- deterministic fake providers for offline tests.

Changing model providers should be configuration or adapter work, not a rewrite of the assistant runtime.

## Action boundary

The model may request a tool action. The platform must still:

1. validate the request;
2. apply policy;
3. execute through an owned tool contract;
4. return a structured result;
5. trace the operation without leaking sensitive content.

Do not add AI to deterministic infrastructure unless reasoning is that repository's responsibility.
