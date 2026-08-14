export const site = {
  title: "M.A.R.K.",
  tagline: "Merely A Responsive Kernel — devblog",
  description:
    "Devblog for M.A.R.K., an intelligent, model-independent personal assistant kernel.",
  repo: "https://github.com/Brightwav3/Assistant-mark-II",
  org: "https://github.com/Brightwav3",
};

export type Status = "Ready" | "Needs work" | "Not built yet";

export const subsystems: { name: string; owns: string; status: Status }[] = [
  { name: "assistant-runtime", owns: "Cross-core composition, interaction orchestration", status: "Ready" },
  { name: "Jarvis-brain-core", owns: "Lifecycle, config, events, registry, health", status: "Ready" },
  { name: "activation-core", owns: "Activation providers and activation events", status: "Ready" },
  { name: "Jarvis-speech-system", owns: "Realtime Core transport for Gemini Live", status: "Ready" },
  { name: "aec-system", owns: "Acoustic echo cancellation and gating", status: "Ready" },
  { name: "intelligence-core", owns: "Model gateway, context, reasoning boundaries", status: "Ready" },
  { name: "memory-core", owns: "Durable memory and bounded retrieval", status: "Ready" },
  { name: "state-core", owns: "Current state, freshness, revisions, snapshots", status: "Ready" },
  { name: "tool-system", owns: "Tool contracts, validation, policy, brokered execution", status: "Ready" },
  { name: "host-tools", owns: "Deterministic host capability catalogue", status: "Ready" },
  { name: "jarvis-device-network", owns: "Device protocol, registry, transport, liveness", status: "Ready" },
  { name: "activation-gemini-bridge", owns: "Historical activation-to-realtime bridge", status: "Not built yet" },
];

export const facts = [
  { label: "Cores delivered", value: "12 of 25" },
  { label: "Imports between cores", value: "0" },
  { label: "Delegation latency", value: "~2 s" },
  { label: "Verified host", value: "Windows x64" },
];

export const hosts: { host: string; status: Status; note: string }[] = [
  { host: "Windows x64", status: "Ready", note: "Source, deterministic tests, and CI with real ffmpeg/ffplay. process.platform reports win32 on 64-bit Windows" },
  { host: "macOS (darwin)", status: "Needs work", note: "No adapter — the factory returns a structured unsupported capability" },
  { host: "Linux", status: "Needs work", note: "No adapter — capture and playback report degraded with a reason" },
];
