---
title: "What the model heard is evidence, not truth"
date: 2026-08-12
area: Memory
mark: II
status: Ready
summary: "The Live API accepts no transcription language hint, so the diagnostic transcript can carry phonetically correct text in the wrong script. The evidence split keeps that out of memory."
---

The Live API accepts no transcription language hint, so the provider's diagnostic transcript can
carry phonetically correct text in the wrong script.

With the opt-in `assistant-runtime` `debug.heard` path, the model-derived `meaning` becomes the
episode input and the provider transcript is excluded from memory extraction. The per-run JSONL
still preserves `verbatim` as auditable evidence.

This improves the stored text without pretending to be raw ASR, and delegated recall stays
protected by the Memory Core pipeline.

Alongside it, every configured model — voice, text, retries, and failures that still consumed
tokens — emits one normalized usage record. Missing provider usage stays `unknown` rather than
becoming zero, and an unpriced call follows an explicit policy that is fail-closed by default.
