// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WhatsAppButton, { normalizeAlbanianPhone } from "../WhatsAppButton";

describe("normalizeAlbanianPhone", () => {
  it("strips spaces and dashes", () => {
    expect(normalizeAlbanianPhone("+355 69 123 4567")).toBe("355691234567");
    expect(normalizeAlbanianPhone("069-123-4567")).toBe("355691234567");
  });

  it("handles +355 prefix", () => {
    expect(normalizeAlbanianPhone("+355691234567")).toBe("355691234567");
  });

  it("handles 355 without plus", () => {
    expect(normalizeAlbanianPhone("355691234567")).toBe("355691234567");
  });

  it("converts 0-prefixed local number to international", () => {
    expect(normalizeAlbanianPhone("0691234567")).toBe("355691234567");
  });

  it("converts 6-prefixed number (no 0) to international", () => {
    expect(normalizeAlbanianPhone("691234567")).toBe("355691234567");
  });
});

describe("WhatsAppButton", () => {
  it("renders nothing when phone is empty", () => {
    const { container } = render(
      <WhatsAppButton phone="" listingTitle="Test" listingUrl="https://example.com" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("generates correct wa.me URL", () => {
    render(
      <WhatsAppButton
        phone="+355 69 123 4567"
        listingTitle="Apartament 2+1"
        listingUrl="https://shtepi.al/listings/tirane/test"
      />
    );

    const link = screen.getByRole("link", { name: /whatsapp/i });
    const href = link.getAttribute("href")!;

    expect(href).toContain("https://wa.me/355691234567");
    expect(href).toContain(encodeURIComponent("Apartament 2+1"));
    expect(href).toContain(encodeURIComponent("https://shtepi.al/listings/tirane/test"));
  });

  it("opens in new tab", () => {
    render(
      <WhatsAppButton
        phone="0691234567"
        listingTitle="Test"
        listingUrl="https://example.com"
      />
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });
});
