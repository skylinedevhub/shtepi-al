// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client — returns null (unauthenticated)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
}));

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import FavoriteButton from "../FavoriteButton";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("FavoriteButton", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("renders a heart icon", () => {
    render(<FavoriteButton listingId="test-1" />);
    const button = screen.getByRole("button", { name: /ruaj njoftimin/i });
    expect(button).toBeTruthy();

    const svg = button.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("toggles visual state on click", () => {
    render(<FavoriteButton listingId="test-1" />);
    const button = screen.getByRole("button");

    expect(button.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button);

    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows tooltip when not authenticated", () => {
    render(<FavoriteButton listingId="test-1" />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Krijoni llogari");
  });

  it("persists to localStorage when not authenticated", () => {
    render(<FavoriteButton listingId="test-2" />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    const stored = JSON.parse(
      localStorageMock.getItem("shtepi_favorites") ?? "[]"
    );
    expect(stored).toContain("test-2");
  });

  it("removes from localStorage on second click", () => {
    localStorageMock.setItem(
      "shtepi_favorites",
      JSON.stringify(["test-3"])
    );

    render(<FavoriteButton listingId="test-3" />);
    const button = screen.getByRole("button");

    // The component initializes from localStorage — already favorited
    // Click to unfavorite
    fireEvent.click(button);

    const stored = JSON.parse(
      localStorageMock.getItem("shtepi_favorites") ?? "[]"
    );
    expect(stored).not.toContain("test-3");
  });
});
