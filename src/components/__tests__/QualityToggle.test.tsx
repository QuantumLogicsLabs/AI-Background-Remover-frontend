import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import QualityToggle from '../QualityToggle'
import '@testing-library/jest-dom/vitest'

describe("QualityToggle", () => {
  it("renders all three quality options", () => {
    const onChange = vi.fn();
    render(<QualityToggle value="fast" onChange={onChange} />);

    expect(screen.getByRole("radio", { name: /fast/i })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /standard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /quality/i })).toBeInTheDocument();
  });

  it("marks the active option as aria-checked", () => {
    const onChange = vi.fn();
    render(<QualityToggle value="standard" onChange={onChange} />);

    expect(screen.getByRole("radio", { name: /standard/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /fast/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("radio", { name: /quality/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onChange with correct value when an option is clicked", () => {
    const onChange = vi.fn();
    render(<QualityToggle value="fast" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /standard/i }));
    expect(onChange).toHaveBeenCalledWith("standard");

    fireEvent.click(screen.getByRole("radio", { name: /quality/i }));
    expect(onChange).toHaveBeenCalledWith("quality");
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(<QualityToggle value="fast" onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole("radio", { name: /standard/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies opacity and pointer-events-none class when disabled", () => {
    const onChange = vi.fn();
    render(<QualityToggle value="fast" onChange={onChange} disabled />);

    const group = screen.getByRole("radiogroup");
    expect(group.className).toContain("opacity-50");
    expect(group.className).toContain("pointer-events-none");
  });

  it('shows correct description text for each option', () => {
    const onChange = vi.fn()
    render(<QualityToggle value="fast" onChange={onChange} />)

    expect(screen.getByRole('radio', { name: /fast/i }))
      .toHaveAttribute('title', 'ISNet · quick results')

    expect(screen.getByRole('radio', { name: /standard/i }))
      .toHaveAttribute('title', 'U²-Net · best for people')

    expect(screen.getByRole('radio', { name: /quality/i }))
      .toHaveAttribute('title', 'BiRefNet · best edges')
  })
})
