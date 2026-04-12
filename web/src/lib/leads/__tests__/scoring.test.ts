import { describe, it, expect } from "vitest";
import { calculateLeadScore } from "../scoring";

describe("calculateLeadScore", () => {
  it("gives base score of 10 for minimal inquiry", () => {
    const result = calculateLeadScore({
      hasPhone: false,
      hasEmail: false,
      messageLength: 5,
      listingPrice: null,
      hoursAfterListing: null,
      isReturningVisitor: false,
    });
    expect(result.score).toBe(10);
    expect(result.color).toBe("red");
    expect(result.label).toBe("I ulët");
  });

  it("scores high for phone + email + long message + expensive listing", () => {
    const result = calculateLeadScore({
      hasPhone: true,
      hasEmail: true,
      messageLength: 100,
      listingPrice: 200_000,
      hoursAfterListing: 12,
      isReturningVisitor: true,
    });
    // 10 + 30 + 20 + 15 + 15 + 10 + 10 = 110 → clamped to 100
    expect(result.score).toBe(100);
    expect(result.color).toBe("green");
    expect(result.label).toBe("I lartë");
  });

  it("gives medium score for email + short message", () => {
    const result = calculateLeadScore({
      hasPhone: false,
      hasEmail: true,
      messageLength: 30,
      listingPrice: 60_000,
      hoursAfterListing: 48,
      isReturningVisitor: false,
    });
    // 10 + 20 + 8 + 8 = 46
    expect(result.score).toBe(46);
    expect(result.color).toBe("yellow");
    expect(result.label).toBe("Mesatar");
  });

  it("adds timing bonus for inquiries within 24h", () => {
    const base = calculateLeadScore({
      hasPhone: false,
      hasEmail: false,
      messageLength: 5,
      listingPrice: null,
      hoursAfterListing: 100,
      isReturningVisitor: false,
    });
    const early = calculateLeadScore({
      hasPhone: false,
      hasEmail: false,
      messageLength: 5,
      listingPrice: null,
      hoursAfterListing: 12,
      isReturningVisitor: false,
    });
    expect(early.score).toBe(base.score + 10);
  });

  it("clamps score to 1-100", () => {
    const maxResult = calculateLeadScore({
      hasPhone: true,
      hasEmail: true,
      messageLength: 200,
      listingPrice: 500_000,
      hoursAfterListing: 1,
      isReturningVisitor: true,
    });
    expect(maxResult.score).toBeLessThanOrEqual(100);
    expect(maxResult.score).toBeGreaterThanOrEqual(1);
  });

  it("returns returning visitor bonus", () => {
    const withoutReturn = calculateLeadScore({
      hasPhone: false,
      hasEmail: false,
      messageLength: 5,
      listingPrice: null,
      hoursAfterListing: null,
      isReturningVisitor: false,
    });
    const withReturn = calculateLeadScore({
      hasPhone: false,
      hasEmail: false,
      messageLength: 5,
      listingPrice: null,
      hoursAfterListing: null,
      isReturningVisitor: true,
    });
    expect(withReturn.score).toBe(withoutReturn.score + 10);
  });
});
