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
  return [...found].toSorted((a, b) => a - b);
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

export interface ClozeSegments {
  pre: string;
  answer: string;
  hint?: string;
  post: string;
}

/**
 * Parse the first cloze deletion into surrounding text + answer + optional hint,
 * so a card can be revealed in place without reflowing. Any other markers in the
 * surrounding text are flattened to their plain answers. Returns null if no marker.
 */
export function clozeSegments(text: string): ClozeSegments | null {
  const re = new RegExp(CLOZE_RE.source); // non-global copy for a single match
  const m = re.exec(text);
  if (!m) return null;
  const flatten = (s: string) =>
    s.replace(CLOZE_RE, (_full, _idx, answer) => answer);
  return {
    pre: flatten(text.slice(0, m.index)),
    answer: m[2],
    hint: m[3] || undefined,
    post: flatten(text.slice(m.index + m[0].length)),
  };
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

/**
 * Split a multi-deletion cloze note into one note per deletion.
 * Each result keeps the full source text but with exactly ONE active
 * deletion (renumbered to c1); all other deletions are rendered as their
 * plain answers. Notes with zero or one deletion are returned unchanged.
 */
export function splitClozeNote(text: string): string[] {
  const indices = clozeIndices(text);
  if (indices.length <= 1) return [text];
  return indices.map((active) =>
    text.replace(CLOZE_RE, (_full, idx, answer, hint) => {
      if (Number(idx) === active) {
        return hint ? `{{c1::${answer}::${hint}}}` : `{{c1::${answer}}}`;
      }
      return answer;
    }),
  );
}
