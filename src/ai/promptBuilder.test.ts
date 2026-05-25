import { describe, it, expect } from 'vitest';
import { buildPrompt } from './promptBuilder';

describe('buildPrompt', () => {
  it('includes topic, count, and cloze syntax instructions for cloze', () => {
    const p = buildPrompt({ topic: 'Photosynthesis', count: 12, type: 'cloze' });
    expect(p).toContain('Photosynthesis');
    expect(p).toContain('12');
    expect(p).toContain('{{c1::');
  });
  it('asks for pipe format for basic cards', () => {
    const p = buildPrompt({ topic: 'Capitals', count: 5, type: 'basic' });
    expect(p).toContain('Front | Back');
  });
});
