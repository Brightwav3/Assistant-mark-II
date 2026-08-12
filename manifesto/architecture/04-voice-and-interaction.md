# Voice and Interaction

Voice is an interaction medium, not the whole assistant. Input, output, realtime sessions, and conversation policy remain separable.

## Voice responsibilities

- Activation detects that an interaction may begin.
- Scribe handles audio input, VAD, segmentation, and transcription.
- Voice handles synthesis and controlled playback.
- Realtime Core handles provider-native audio sessions and interruption semantics.
- Assistant Runtime coordinates activation, session lifecycle, timeout, state, and memory.
- Interaction policy decides how a conversation proceeds above those providers.

## Conversation behavior

The normal path should support:

```text
idle → activation → listening → reasoning → speaking → listening
```

Interruption must revoke old output authority, stop stale playback, reject late results, and allow the next turn to continue safely.

Full room acoustic echo cancellation is a separate boundary. Headphones, local simulations, and provider-reported interruption are valid development steps; they are not proof of production room acoustics.
