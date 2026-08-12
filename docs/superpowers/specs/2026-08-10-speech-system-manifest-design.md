# Speech System Manifest Update

## Scope

Update `README AGENTS.md` so the Jarvis manifesto reflects the implemented
speech subsystem without changing the long-term architecture or treating
Gemini as a platform dependency.

## Addition

Insert a compact **Current Speech System** section after the interaction-channel
principles. It will:

- identify Scribe Core, Voice Core v0.1, Realtime Core, and the future
  Interaction Core;
- show their repository layout and one-way responsibilities;
- describe Gemini Live as a private Realtime Core adapter behind
  provider-neutral contracts;
- state that `serverContent.interrupted` produces a hard playback stop and
  stale output is rejected;
- link to the detailed Speech System documentation.

## Boundaries

The section will not claim that Intelligence Core, interaction coordination,
acoustic echo cancellation, or a full device/satellite runtime are complete.
It will preserve the manifesto's model-provider independence principle.

## Validation

Review headings, links, and terminology against
`speech-system/README.md` and `realtime core/README.md`. No runtime code
or speech package files change.
