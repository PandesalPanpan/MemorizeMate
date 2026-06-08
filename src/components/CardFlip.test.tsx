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

  it('cloze card shows an in-place blank then fills it with the answer', async () => {
    const onGrade = () => {};
    render(
      <CardFlip
        question="The … orbits the galaxy."
        answer="sun"
        clozePre="The "
        clozePost=" orbits the galaxy."
        clozeHint="star"
        onGrade={onGrade}
        type="cloze"
      />,
    );

    // Blank shows the hint, answer is hidden, surrounding text stays put
    expect(screen.getByText('[star]')).toBeInTheDocument();
    expect(screen.getByText(/orbits the galaxy\./)).toBeInTheDocument();
    expect(screen.queryByText('sun')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));

    // The blank is filled in place with the answer; hint placeholder gone
    expect(screen.getByText('sun')).toBeInTheDocument();
    expect(screen.queryByText('[star]')).not.toBeInTheDocument();
    expect(screen.getByText(/orbits the galaxy\./)).toBeInTheDocument();
  });

  it('cloze card reveals on Space key', async () => {
    const onGrade = () => {};
    render(
      <CardFlip
        question="Capital is …"
        answer="Paris"
        clozePre="Capital is "
        clozePost=""
        clozeHint="city"
        onGrade={onGrade}
        type="cloze"
      />,
    );

    expect(screen.getByText('[city]')).toBeInTheDocument();
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();

    await userEvent.keyboard(' ');

    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.queryByText('[city]')).not.toBeInTheDocument();
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

  it('reveals basic card on Enter key', async () => {
    const onGrade = () => {};
    render(<CardFlip question="Q" answer="A" onGrade={onGrade} />);
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('reveals basic card on Space key and rates with number keys', async () => {
    let rated = '';
    function onGrade(r: string) { rated = r; }
    render(<CardFlip question="Q" answer="A" onGrade={onGrade} />);
    await userEvent.keyboard(' ');
    expect(screen.getByText('A')).toBeInTheDocument();
    await userEvent.keyboard('1');
    expect(rated).toBe('again');
  });

  it('cloze card resets to question after rating and new card appears', async () => {
    let gradeCount = 0;
    function onGrade() { gradeCount++; }

    const { rerender } = render(
      <CardFlip key="c1" question="The … orbits." answer="sun" clozePre="The " clozePost=" orbits." onGrade={onGrade} type="cloze" />,
    );

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('sun')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /good/i }));
    expect(gradeCount).toBe(1);

    // Rerender with a new card — the component remounts because key changed
    rerender(
      <CardFlip key="c2" question="Capital is …" answer="Paris" clozePre="Capital is " clozePost="" onGrade={onGrade} type="cloze" />,
    );

    // Should show the new card's blank, not revealed
    expect(screen.getByText('[...]')).toBeInTheDocument();
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
    expect(screen.queryByText('sun')).not.toBeInTheDocument();
  });
});
