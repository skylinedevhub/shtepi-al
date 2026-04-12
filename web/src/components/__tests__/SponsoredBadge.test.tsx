// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SponsoredBadge from "../SponsoredBadge";

describe("SponsoredBadge", () => {
  it("renders default variant with text", () => {
    render(<SponsoredBadge />);
    expect(screen.getByText("Sponsorizuar")).toBeTruthy();
  });

  it("renders compact variant", () => {
    render(<SponsoredBadge variant="compact" />);
    expect(screen.getByText("Sponsorizuar")).toBeTruthy();
  });

  it("has accessible aria-label", () => {
    render(<SponsoredBadge />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Njoftim i sponsorizuar");
  });

  it("default variant contains star SVG", () => {
    const { container } = render(<SponsoredBadge />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("compact variant uses smaller text", () => {
    const { container } = render(<SponsoredBadge variant="compact" />);
    const badge = container.querySelector("[role='status']");
    expect(badge?.className).toContain("text-[10px]");
  });
});
