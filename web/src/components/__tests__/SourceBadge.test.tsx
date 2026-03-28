// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import SourceBadge from "../SourceBadge";

describe("SourceBadge", () => {
  it("renders with count > 1", () => {
    render(
      <SourceBadge sources={["merrjep", "duashpi"]} count={2} />
    );
    expect(screen.getByText(/listuar në 2 faqe/i)).toBeTruthy();
  });

  it("shows source names", () => {
    render(
      <SourceBadge sources={["merrjep", "duashpi", "njoftime"]} count={3} />
    );
    expect(screen.getByText(/merrjep, duashpi, njoftime/)).toBeTruthy();
  });

  it("does not render with count = 1", () => {
    const { container } = render(
      <SourceBadge sources={["merrjep"]} count={1} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("does not render with count = 0", () => {
    const { container } = render(
      <SourceBadge sources={[]} count={0} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("deduplicates sources", () => {
    render(
      <SourceBadge sources={["merrjep", "merrjep", "duashpi"]} count={3} />
    );
    // Should show "merrjep, duashpi" not "merrjep, merrjep, duashpi"
    expect(screen.getByText(/merrjep, duashpi/)).toBeTruthy();
  });
});
