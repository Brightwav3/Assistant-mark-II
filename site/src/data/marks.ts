export type Phase = "Complete" | "Active" | "Future";

export type Mark = {
  id: "I" | "II" | "III";
  label: string;
  name: string;
  phase: Phase;
  question: string;
  facts: { label: string; value: string }[];
  /** Markdown-free prose blocks. `pre` renders as a diagram. */
  blocks: ({ kind: "p" | "pre"; text: string })[];
};

export const marks: Mark[] = [
  {
    id: "I",
    label: "M.A.R.K. I",
    name: "Proof of concept",
    phase: "Complete",
    question:
      "Can a long-term personal assistant exist as a modular system independent of any particular AI model?",
    facts: [
      { label: "Answer", value: "Yes" },
      { label: "Repositories", value: "11" },
      { label: "Baseline tag", value: "mark-i-baseline" },
      { label: "Status", value: "Frozen" },
    ],
    blocks: [
      { kind: "p", text: "Mark I proved that independent cores can be composed into one usable system." },
      { kind: "pre", text: "Activation\n    ↓\nAssistant Runtime\n    ↓\nSpeech / Realtime\n    ↓\nIntelligence\n    ↓\nMemory + State\n    ↓\nTools" },
      { kind: "p", text: "The proof included independent repositories, a composition runtime, native realtime audio, spoken interaction, interruption and barge-in, persistent conversation summaries, memory and state integration, bounded tool execution, and deterministic safety boundaries." },
      { kind: "p", text: "Mark I did not need to be elegant, maximally natural, or broadly useful every day. Its product was architectural proof." },
    ],
  },
  {
    id: "II",
    label: "M.A.R.K. II",
    name: "Intelligent half-duplex assistant",
    phase: "Active",
    question:
      "How capable can an assistant become with the current generation of half-duplex voice models?",
    facts: [
      { label: "Cores delivered", value: "12 of 25" },
      { label: "Imports between cores", value: "0" },
      { label: "Delegation latency", value: "~2 s" },
      { label: "Verified host", value: "Windows x64" },
    ],
    blocks: [
      { kind: "p", text: "Mark II is where the system stops proving that it can work and starts becoming genuinely capable. The voice model is the realtime interaction layer of a larger system: it should recognize when a task needs deeper reasoning, a deterministic tool, a long-running operation, or another agent, and delegate that work while continuing to manage the user interaction." },
      { kind: "pre", text: "                         Voice Model\n                              │\n                 ┌────────────┴────────────┐\n                 │                         │\n            Conversation              Delegation\n                                           │\n                                  Intelligence Core\n                                           │\n                         ┌─────────────────┼─────────────────┐\n                         │                 │                 │\n                       Tools            Reasoner           Agents" },
      { kind: "p", text: "Its priorities are voice × intelligence integration, delegation from realtime interaction into deeper reasoning, serious but explicitly bounded tools, lower perceived latency and better endpointing, reliable interruption, cancellation and recovery, improved audio coordination and echo cancellation, state-aware workflows and provider switching, and full-duplex-ready event and lifecycle contracts." },
      { kind: "p", text: "Mark II remains half-duplex. It extracts the maximum useful capability from the current conversational model paradigm while keeping the platform ready for a different future." },
    ],
  },
  {
    id: "III",
    label: "M.A.R.K. III",
    name: "Future conversational assistant",
    phase: "Future",
    question:
      "What becomes possible when a model can process both directions continuously and decide when to speak?",
    facts: [
      { label: "Scope", value: "Out of Mark II" },
      { label: "Requires", value: "generation-3 model" },
      { label: "Entries", value: "0" },
      { label: "Status", value: "Not started" },
    ],
    blocks: [
      { kind: "p", text: "Mark III is a future generation, outside the current Mark II scope. It will explore conversational systems that can move beyond alternating turns when the model technology makes that architecture practical." },
      { kind: "p", text: "Mark II only prepares the boundaries for that possibility. It does not implement Mark III prematurely." },
      { kind: "p", text: "The long-term test is a migration: a better intelligence should arrive onto the same platform, tools, memory, state, permissions, devices, and interfaces — and improve the assistant without requiring its nervous system to be rebuilt." },
    ],
  },
];

export const phasePill: Record<Phase, [string, string]> = {
  Complete: ["var(--surface-sunken)", "var(--text-secondary)"],
  Active: ["var(--accent-soft)", "var(--accent-hover)"],
  Future: ["var(--surface-sunken)", "var(--text-tertiary)"],
};
