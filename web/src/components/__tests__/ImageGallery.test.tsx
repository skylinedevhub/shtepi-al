// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ImageGallery from "../ImageGallery";

describe("ImageGallery", () => {
  it("renders thumbnails with loading=lazy", () => {
    const images = [
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
      "https://example.com/3.jpg",
    ];
    render(<ImageGallery images={images} alt="Test" />);
    const thumbnails = screen.getAllByRole("img").filter(
      (img) => img.getAttribute("alt")?.includes("thumbnail")
    );
    for (const thumb of thumbnails) {
      expect(thumb.getAttribute("loading")).toBe("lazy");
    }
  });

  it("shows empty state when no images", () => {
    render(<ImageGallery images={[]} alt="Test" />);
    expect(screen.getByText("Nuk ka foto")).toBeDefined();
  });

  it("does not show thumbnails for single image", () => {
    render(<ImageGallery images={["https://example.com/1.jpg"]} alt="Test" />);
    const thumbnails = screen.queryAllByRole("img").filter(
      (img) => img.getAttribute("alt")?.includes("thumbnail")
    );
    expect(thumbnails).toHaveLength(0);
  });
});
