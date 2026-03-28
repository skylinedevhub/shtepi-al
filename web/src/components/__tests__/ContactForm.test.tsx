// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import ContactForm from "../ContactForm";

describe("ContactForm", () => {
  it("renders all form fields", () => {
    render(
      <ContactForm listingId="test-id" listingTitle="Apartament 2+1" />
    );

    expect(screen.getByLabelText(/emri juaj/i)).toBeTruthy();
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/telefon/i)).toBeTruthy();
    expect(screen.getByLabelText(/mesazhi/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /dërgo mesazhin/i })).toBeTruthy();
  });

  it("prefills message with listing title", () => {
    render(
      <ContactForm listingId="test-id" listingTitle="Apartament 2+1" />
    );

    const textarea = screen.getByLabelText(/mesazhi/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Apartament 2+1");
  });

  it("has a honeypot field that is visually hidden", () => {
    const { container } = render(
      <ContactForm listingId="test-id" listingTitle="Test" />
    );

    const honeypotInput = container.querySelector(
      'input[name="website"]'
    ) as HTMLInputElement;
    expect(honeypotInput).toBeTruthy();
    expect(honeypotInput.tabIndex).toBe(-1);

    // Verify the container div uses position absolute off-screen
    const wrapper = honeypotInput.closest("div[aria-hidden]");
    expect(wrapper).toBeTruthy();
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    const style = (wrapper as HTMLElement).style;
    expect(style.position).toBe("absolute");
    expect(style.left).toBe("-9999px");
  });

  it("renders section heading in Albanian", () => {
    render(
      <ContactForm listingId="test-id" listingTitle="Test" />
    );

    expect(screen.getByText("Dërgo mesazh")).toBeTruthy();
  });
});
