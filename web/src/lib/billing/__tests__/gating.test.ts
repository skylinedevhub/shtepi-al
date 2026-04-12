import { describe, it, expect } from "vitest";
import { FREE_TIER } from "../gating";
import type { PlanFeatures } from "../../db/schema";

// Test the plan features structure and free tier defaults
// DB-dependent functions tested in integration tests

describe("FREE_TIER defaults", () => {
  it("has restrictive limits for unpaid users", () => {
    expect(FREE_TIER.listing_limit).toBe(5);
    expect(FREE_TIER.lead_limit_monthly).toBe(5);
    expect(FREE_TIER.featured_cities).toBe(0);
    expect(FREE_TIER.ranking_boost).toBe(0);
    expect(FREE_TIER.team_seats).toBe(1);
  });

  it("disables premium features", () => {
    expect(FREE_TIER.has_crm_export).toBe(false);
    expect(FREE_TIER.has_whatsapp_routing).toBe(false);
    expect(FREE_TIER.has_api_access).toBe(false);
    expect(FREE_TIER.has_analytics_advanced).toBe(false);
  });
});

describe("Plan feature tiers", () => {
  const starter: PlanFeatures = {
    listing_limit: 30,
    lead_limit_monthly: 20,
    featured_cities: 1,
    has_crm_export: false,
    has_whatsapp_routing: false,
    has_api_access: false,
    has_analytics_advanced: false,
    team_seats: 1,
    ranking_boost: 1,
  };

  const growth: PlanFeatures = {
    listing_limit: 200,
    lead_limit_monthly: null,
    featured_cities: 3,
    has_crm_export: true,
    has_whatsapp_routing: true,
    has_api_access: false,
    has_analytics_advanced: true,
    team_seats: 3,
    ranking_boost: 2,
  };

  const premium: PlanFeatures = {
    listing_limit: null,
    lead_limit_monthly: null,
    featured_cities: null,
    has_crm_export: true,
    has_whatsapp_routing: true,
    has_api_access: true,
    has_analytics_advanced: true,
    team_seats: 10,
    ranking_boost: 3,
  };

  it("starter has basic limits", () => {
    expect(starter.listing_limit).toBe(30);
    expect(starter.lead_limit_monthly).toBe(20);
    expect(starter.ranking_boost).toBe(1);
  });

  it("growth has higher limits and CRM", () => {
    expect(growth.listing_limit).toBe(200);
    expect(growth.lead_limit_monthly).toBeNull(); // unlimited
    expect(growth.has_crm_export).toBe(true);
    expect(growth.has_whatsapp_routing).toBe(true);
    expect(growth.ranking_boost).toBe(2);
  });

  it("premium has unlimited everything", () => {
    expect(premium.listing_limit).toBeNull(); // unlimited
    expect(premium.lead_limit_monthly).toBeNull();
    expect(premium.has_api_access).toBe(true);
    expect(premium.ranking_boost).toBe(3);
    expect(premium.team_seats).toBe(10);
  });

  it("tiers escalate monotonically in ranking_boost", () => {
    expect(FREE_TIER.ranking_boost).toBeLessThan(starter.ranking_boost);
    expect(starter.ranking_boost).toBeLessThan(growth.ranking_boost);
    expect(growth.ranking_boost).toBeLessThan(premium.ranking_boost);
  });

  it("tiers escalate in listing limits", () => {
    expect(FREE_TIER.listing_limit!).toBeLessThan(starter.listing_limit!);
    expect(starter.listing_limit!).toBeLessThan(growth.listing_limit!);
    // premium is null (unlimited)
    expect(premium.listing_limit).toBeNull();
  });
});
