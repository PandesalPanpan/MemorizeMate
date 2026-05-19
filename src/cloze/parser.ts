const CLOZE_RE = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g;

export interface RenderedCloze {
  question: string;
  answer: string;
}

export interface ClozeCard extends RenderedCloze {
  index: number;
}

export function clozeIndices(text: string): number[] {
  const found = new Set<number>();
  for (const m of text.matchAll(CLOZE_RE)) found.add(Number(m[1]));
  return [...found].sort((a, b) => a - b);
}

export function renderCloze(text: string, activeIndex: number): RenderedCloze {
  const question = text.replace(CLOZE_RE, (_full, idx, answer, hint) => {
    if (Number(idx) === activeIndex) return hint ? `[${hint}]` : '[...]';
    return answer;
  });
  const answer = text.replace(CLOZE_RE, (_full, _idx, ans) => ans);
  return { question, answer };
}

export function parseCloze(text: string): ClozeCard[] {
  return clozeIndices(text).map((index) => ({ index, ...renderCloze(text, index) }));
}

export function wrapSelection(
  text: string,
  start: number,
  end: number,
  index: number,
): string {
  const selected = text.slice(start, end);
  return text.slice(0, start) + `{{c${index}::${selected}}}` + text.slice(end);
}

export function nextClozeIndex(text: string): number {
  const idx = clozeIndices(text);
  return idx.length ? Math.max(...idx) + 1 : 1;
}
