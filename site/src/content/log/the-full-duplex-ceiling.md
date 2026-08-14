---
title: "The full-duplex ceiling is the model, not the timer"
date: 2026-07-28
area: Platform
mark: II
status: Needs work
summary: "Gemini Live waits for the user to stop before responding and cannot backchannel while they speak. That is a model limitation, not a missing state transition."
---

The inherited composition runs a native bidirectional audio session through Gemini Live. That
solves the media plumbing, but the model remains generation-2 and turn-based: it waits for the user
to stop before responding and cannot backchannel while the user is speaking.

This is a model limitation, not a missing state transition or a silence timer that can be tuned
away. True full-duplex requires a generation-3 model that can continuously process both directions
and decide when to speak.

Mark II still has application work to do around that ceiling:

- cancellation must be immediate and observable;
- output must be rejected after session closure;
- delegated work must be correlated with its interaction;
- state must survive interruption and recovery;
- capture and playback must share the signal information required for echo cancellation;
- provider-specific behaviour must stay behind provider-neutral contracts.

The goal is to solve those internal gaps now while keeping the provider contract stable, so a
future Mark III model can be added without rebuilding the assistant around it.
