import type { CardType } from '../types/models';

export interface PromptInput { topic: string; count: number; type: CardType; }

// Condensed from SuperMemo's "20 rules of formulating knowledge". Only the two
// principles that the generating model can actually act on from a topic alone:
// build on basics (rule 3) and the minimum information principle (rule 4).
const FORMULATION_RULES = [
  `Write the cards using these principles:`,
  `- Build on the basics: favour simple, foundational facts over clever or convoluted ones.`,
  `- Minimum information principle: each card tests ONE atomic fact. Keep the question short and the answer as short as possible (ideally a single word or short phrase). Split any complex fact into several simple cards instead of one long, wordy card.`,
].join('\n');

export function buildPrompt({ topic, count, type }: PromptInput): string {
  const format = type === 'cloze'
    ? `Each line is ONE cloze card with EXACTLY ONE deletion, using this exact syntax: wrap the single hidden answer as {{c1::answer}} (use {{c1::answer::hint}} to add a hint). Do NOT put more than one deletion on a line. Example: The powerhouse of the cell is the {{c1::mitochondria}}.`
    : `Each line is ONE card written as "Front | Back" (a question, a space, a pipe, a space, then the answer). Example: Capital of France | Paris`;

  return [
    `You are helping me make spaced-repetition flashcards.`,
    `Topic: ${topic}`,
    `Make ${count} flashcards.`,
    FORMULATION_RULES,
    format,
    `Output ONLY the ${count} lines, no numbering, no extra commentary.`,
  ].join('\n\n');
}
