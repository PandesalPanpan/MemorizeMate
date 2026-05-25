import type { CardType } from '../types/models';

export interface PromptInput { topic: string; count: number; type: CardType; }

export function buildPrompt({ topic, count, type }: PromptInput): string {
  const format = type === 'cloze'
    ? `Each line is ONE cloze card using this exact syntax: wrap the hidden answer as {{c1::answer}} (use {{c2::...}} for a second deletion on the same line, and {{c1::answer::hint}} to add a hint). Example: The powerhouse of the cell is the {{c1::mitochondria}}.`
    : `Each line is ONE card written as "Front | Back" (a question, a space, a pipe, a space, then the answer). Example: Capital of France | Paris`;

  return [
    `You are helping me make spaced-repetition flashcards.`,
    `Topic: ${topic}`,
    `Make ${count} flashcards.`,
    format,
    `Output ONLY the ${count} lines, no numbering, no extra commentary.`,
  ].join('\n\n');
}
