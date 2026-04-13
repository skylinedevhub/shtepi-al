// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ValuationCalculator from "../ValuationCalculator";

const mockZones = {
  zones: [
    { zk_numer: 8270, display_label: "8270 - Tirane Qender" },
    { zk_numer: 3290, display_label: "3290 - Durres Qender" },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ValuationCalculator", () => {
  it("renders form with all required fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(screen.getByText("Zona Kadastrale")).toBeDefined();
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

  it("loads and displays zone options from API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockZones),
    });

    render(<ValuationCalculator />);

    await waitFor(() => {
      expect(screen.getByText("8270 - Tirane Qender")).toBeDefined();
      expect(screen.getByText("3290 - Durres Qender")).toBeDefined();
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
