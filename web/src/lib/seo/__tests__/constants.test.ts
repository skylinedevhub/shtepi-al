import { describe, it, expect } from "vitest";
import {
  SITE_NAME,
  PROPERTY_TYPE_SQ,
  PROPERTY_TYPE_EN,
  TRANSACTION_TYPE_SQ,
  TRANSACTION_TYPE_EN,
  TRANSACTION_TYPE_URL,
  URL_TO_TRANSACTION,
} from "../constants";

describe("SEO constants", () => {
  it("has matching property type keys for SQ and EN", () => {
    expect(Object.keys(PROPERTY_TYPE_SQ).sort()).toEqual(
      Object.keys(PROPERTY_TYPE_EN).sort()
    );
  });

  it("has matching transaction type keys for SQ and EN", () => {
    expect(Object.keys(TRANSACTION_TYPE_SQ).sort()).toEqual(
      Object.keys(TRANSACTION_TYPE_EN).sort()
    );
  });

  it("URL_TO_TRANSACTION inverts TRANSACTION_TYPE_URL", () => {
    for (const [key, urlSlug] of Object.entries(TRANSACTION_TYPE_URL)) {
      expect(URL_TO_TRANSACTION[urlSlug]).toBe(key);
    }
  });

  it("SITE_NAME is ShtëpiAL", () => {
    expect(SITE_NAME).toBe("ShtëpiAL");
  });
});
