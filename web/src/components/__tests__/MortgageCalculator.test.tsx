// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import MortgageCalculator, {
  calculateMonthlyPayment,
} from "../MortgageCalculator";

describe("calculateMonthlyPayment", () => {
  it("computes correct monthly payment for standard loan", () => {
    // €100,000 price, 20% down => €80,000 principal
    // 4.5% rate, 20 years
    const monthly = calculateMonthlyPayment(80_000, 4.5, 20);
    // Expected ~€506
    expect(monthly).toBeGreaterThan(505);
    expect(monthly).toBeLessThan(507);
  });

  it("returns 0 for zero principal", () => {
    expect(calculateMonthlyPayment(0, 4.5, 20)).toBe(0);
  });

  it("returns 0 for zero years", () => {
    expect(calculateMonthlyPayment(80_000, 4.5, 0)).toBe(0);
  });

  it("handles 0% interest rate (simple division)", () => {
    // €80,000 / (20 * 12) = €333.33
    const monthly = calculateMonthlyPayment(80_000, 0, 20);
    expect(Math.round(monthly)).toBe(333);
  });

  it("computes correct payment for shorter term", () => {
    // €80,000, 4.5%, 10 years => ~€828
    const monthly = calculateMonthlyPayment(80_000, 4.5, 10);
    expect(monthly).toBeGreaterThan(827);
    expect(monthly).toBeLessThan(830);
  });
});

describe("MortgageCalculator component", () => {
  it("renders all input fields with Albanian labels", () => {
    render(<MortgageCalculator price={100_000} />);

    expect(screen.getByLabelText(/çmimi i pronës/i)).toBeTruthy();
    expect(screen.getByLabelText(/kësti fillestar/i)).toBeTruthy();
    expect(screen.getByLabelText(/norma e interesit/i)).toBeTruthy();
    expect(screen.getByLabelText(/afati \(vite\)/i)).toBeTruthy();
  });

  it("renders the calculator heading", () => {
    render(<MortgageCalculator price={100_000} />);

    expect(screen.getByText("Llogaritësi i kredisë")).toBeTruthy();
  });

  it("displays monthly payment result", () => {
    render(<MortgageCalculator price={100_000} />);

    // Default: 100k, 20% down, 4.5%, 20 years => ~506 EUR
    expect(screen.getByText(/kësti mujor/i)).toBeTruthy();
    expect(screen.getByText(/506/)).toBeTruthy();
  });

  it("renders CTA button in Albanian", () => {
    render(<MortgageCalculator price={100_000} />);

    expect(screen.getByText("Apliko për kredi")).toBeTruthy();
  });

  it("pre-fills the price from listing", () => {
    render(<MortgageCalculator price={150_000} />);

    const priceInput = screen.getByLabelText(
      /çmimi i pronës/i
    ) as HTMLInputElement;
    expect(priceInput.value).toBe("150000");
  });

  it("updates monthly payment when inputs change", () => {
    render(<MortgageCalculator price={100_000} />);

    // Change price to 200,000
    const priceInput = screen.getByLabelText(
      /çmimi i pronës/i
    ) as HTMLInputElement;
    fireEvent.change(priceInput, { target: { value: "200000" } });

    // Monthly should be ~1012 (double the default)
    expect(screen.getByText(/1\.012/)).toBeTruthy();
  });

  it("sets partner URL on CTA when provided", () => {
    render(
      <MortgageCalculator
        price={100_000}
        partnerUrl="https://bank.example.com/apply"
      />
    );

    const ctaLink = screen.getByText("Apliko për kredi").closest("a");
    expect(ctaLink?.getAttribute("href")).toBe(
      "https://bank.example.com/apply"
    );
    expect(ctaLink?.getAttribute("target")).toBe("_blank");
    expect(ctaLink?.getAttribute("rel")).toContain("sponsored");
  });

  it("falls back to # href when no partner URL", () => {
    render(<MortgageCalculator price={100_000} />);

    const ctaLink = screen.getByText("Apliko për kredi").closest("a");
    expect(ctaLink?.getAttribute("href")).toBe("#");
  });

  it("renders term dropdown with all options", () => {
    render(<MortgageCalculator price={100_000} />);

    const select = screen.getByLabelText(/afati \(vite\)/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => Number(o.value));
    expect(options).toEqual([10, 15, 20, 25, 30]);
  });

  it("defaults to null price gracefully", () => {
    render(<MortgageCalculator price={null} />);

    const priceInput = screen.getByLabelText(
      /çmimi i pronës/i
    ) as HTMLInputElement;
    expect(priceInput.value).toBe("100000");
  });
});
