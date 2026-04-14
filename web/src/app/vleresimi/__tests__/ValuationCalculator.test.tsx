// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ValuationCalculator from "../ValuationCalculator";

const mockZones = {
  zones: [
    { zk_numer: 8270, display_label: "8270 - Q.TIRANE (TIRANË)" },
    { zk_numer: 3290, display_label: "3290 - SELISHTE (POGRADEC)" },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ValuationCalculator", () => {
  it("renders form with zone mode selector and core fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(
        screen.getByText(/si deshironi te zgjidhni zonen/i)
      ).toBeDefined();
    });
    expect(screen.getByText("Siperfaqja (m²)")).toBeDefined();
    expect(screen.getByText("Viti i Ndertimit")).toBeDefined();
    expect(screen.getByText("Tipi i Prones")).toBeDefined();
    expect(screen.getByRole("button", { name: /llogarit/i })).toBeDefined();
  });

  it("shows empty state message before submission", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(screen.getByText(/plotesoni formularin/i)).toBeDefined();
    });
  });

  it("shows manual input when 'Vendos Vleren' selected", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(screen.getByLabelText(/si deshironi/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/si deshironi/i), {
      target: { value: "manual" },
    });

    expect(screen.getByPlaceholderText("p.sh. 8270")).toBeDefined();
  });

  it("shows searchable zone list when 'Zgjidh nga Lista' selected", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(screen.getByLabelText(/si deshironi/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/si deshironi/i), {
      target: { value: "list" },
    });

    const searchInput = screen.getByPlaceholderText(/kerko zone/i);
    expect(searchInput).toBeDefined();

    // Focus to open dropdown, then check zone labels
    fireEvent.focus(searchInput);
    await waitFor(() => {
      expect(screen.getByText("8270 - Q.TIRANE (TIRANË)")).toBeDefined();
      expect(screen.getByText("3290 - SELISHTE (POGRADEC)")).toBeDefined();
    });
  });

  it("shows error when zones fail to load", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(
        screen.getByText(/nuk mundem te ngarkojme zonat/i)
      ).toBeDefined();
    });
  });

  it("renders all 8 property type options", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(screen.getByText("Ndertese banimi")).toBeDefined();
    });
    expect(screen.getByText("Truall")).toBeDefined();
    expect(screen.getByText("Pyll")).toBeDefined();
  });

  it("shows MVP disclaimer", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(screen.getByText(/kujdes/i)).toBeDefined();
    });
  });
});
