# Physical Space and Interfaces

Physical devices are independent endpoints, not hidden extensions of the core.

## Device boundary

A device should identify itself, advertise capabilities, maintain liveness, exchange validated messages, accept commands, emit events, and reconnect safely. Hardware-specific behavior belongs behind the device boundary.

Software simulators are first-class development tools. Hardware should not be required to test protocol, lifecycle, or policy behavior.

## Context

Rooms, presence, microphones, speakers, displays, phones, computers, and wearables may provide signals about where an interaction is happening. Presence is uncertain and should be represented as uncertainty, not surveillance certainty.

The response channel should follow the interaction context when possible, without turning context awareness into permanent recording.
