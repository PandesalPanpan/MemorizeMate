import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardFlip } from './CardFlip';

describe('CardFlip', () => {
  it('basic card shows question and reveals answer below', async () => {
    const onGrade = () => {};
    render(<CardFlip question="What is 2+2?" answer="Four" onGrade={onGrade} type="basic" />);

    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.queryByText('Four')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.getByText('Four')).toBeInTheDocument();
  });

  it('basic card defaults to basic behavior when type is omitted', async () => {
    const onGrade = () => {};
    render(<CardFlip question="Q" answer="A" onGrade={onGrade} />);

    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.queryByText('A')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('cloze card shows question with placeholder then reveals answer inline', async () => {
    const onGrade = () => {};
    render(<CardFlip question="The [...] orbits the galaxy." answer="The sun orbits the galaxy." onGrade={onGrade} type="cloze" />);

    expect(screen.getByText('The [...] orbits the galaxy.')).toBeInTheDocument();
    expect(screen.queryByText('The sun orbits the galaxy.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));

    // After reveal, the prompt should show the full answer text inline
    expect(screen.getByText('The sun orbits the galaxy.')).toBeInTheDocument();
    // The placeholder text should be gone
    expect(screen.queryByText('The [...] orbits the galaxy.')).not.toBeInTheDocument();
    // No separate answer paragraph — no duplication
    expect(screen.queryByText('The sun orbits the galaxy.')).toBeInTheDocument();
  });

  it('cloze card reveals on Space key', async () => {
    const onGrade = () => {};
    render(<CardFlip question="Capital is [city]" answer="Capital is Paris" onGrade={onGrade} type="cloze" />);

    expect(screen.getByText('Capital is [city]')).toBeInTheDocument();

    await userEvent.keyboard(' ');

    expect(screen.getByText('Capital is Paris')).toBeInTheDocument();
    expect(screen.queryByText('Capital is [city]')).not.toBeInTheDocument();
  });

  it('cloze card allows rating after reveal', async () => {
    let rated = '';
    function onGrade(r: string) { rated = r; }
    const { rerender } = render(
      <CardFlip question="[...]" answer="answer" onGrade={onGrade} type="cloze" />,
    );

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /good/i }));

    expect(rated).toBe('good');
  });

  it('cloze card resets to question after rating and new card appears', async () => {
    let gradeCount = 0;
    function onGrade() { gradeCount++; }

    const { rerender } = render(
      <CardFlip key="c1" question="The [...] orbits." answer="The sun orbits." onGrade={onGrade} type="cloze" />,
    );

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('The sun orbits.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /good/i }));
    expect(gradeCount).toBe(1);

    // Rerender with a new card — the component remounts because key changed
    rerender(
      <CardFlip key="c2" question="Capital is [...]" answer="Capital is Paris" onGrade={onGrade} type="cloze" />,
    );

    // Should show the new question, not revealed
    expect(screen.getByText('Capital is [...]')).toBeInTheDocument();
    expect(screen.queryByText('Capital is Paris')).not.toBeInTheDocument();
    expect(screen.queryByText('The sun orbits.')).not.toBeInTheDocument();
  });
});
