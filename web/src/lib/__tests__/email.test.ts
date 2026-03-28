// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

// Clear RESEND_API_KEY before importing
beforeEach(() => {
  delete process.env.RESEND_API_KEY;
});

describe("sendEmail", () => {
  it("returns null and does not throw when RESEND_API_KEY is missing", async () => {
    const { sendEmail } = await import("../email");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });
    expect(result).toBeNull();
  });
});

describe("email templates", () => {
  it("welcomeEmail returns subject and html with Albanian text", async () => {
    const { welcomeEmail } = await import("../email-templates");
    const { subject, html } = welcomeEmail("Arben");
    expect(subject).toBe("Mirë se vini në ShtëpiAL");
    expect(html).toContain("Arben");
    expect(html).toContain("ShtëpiAL");
    expect(html.length).toBeGreaterThan(0);
  });

  it("listingApprovedEmail returns subject and html", async () => {
    const { listingApprovedEmail } = await import("../email-templates");
    const { subject, html } = listingApprovedEmail(
      "Apartament 2+1",
      "https://shtepi.al/listing/123"
    );
    expect(subject).toBe("Njoftimi juaj u aprovua");
    expect(html).toContain("Apartament 2+1");
    expect(html).toContain("https://shtepi.al/listing/123");
  });

  it("listingRejectedEmail returns subject and html with reason", async () => {
    const { listingRejectedEmail } = await import("../email-templates");
    const { subject, html } = listingRejectedEmail(
      "Apartament 3+1",
      "Fotot nuk janë të qarta"
    );
    expect(subject).toBe("Njoftimi juaj u refuzua");
    expect(html).toContain("Apartament 3+1");
    expect(html).toContain("Fotot nuk janë të qarta");
  });

  it("passwordResetEmail returns subject and html", async () => {
    const { passwordResetEmail } = await import("../email-templates");
    const { subject, html } = passwordResetEmail(
      "https://shtepi.al/reset?token=abc"
    );
    expect(subject).toBe("Rivendosni fjalëkalimin");
    expect(html).toContain("https://shtepi.al/reset?token=abc");
    expect(html).toContain("Rivendos fjalëkalimin");
  });

  it("emailVerificationEmail returns subject and html", async () => {
    const { emailVerificationEmail } = await import("../email-templates");
    const { subject, html } = emailVerificationEmail(
      "https://shtepi.al/verify?token=xyz"
    );
    expect(subject).toBe("Verifikoni emailin tuaj");
    expect(html).toContain("https://shtepi.al/verify?token=xyz");
    expect(html).toContain("Verifiko emailin");
  });

  it("all templates contain ShtëpiAL branding", async () => {
    const templates = await import("../email-templates");
    const results = [
      templates.welcomeEmail("Test"),
      templates.listingApprovedEmail("Test", "https://example.com"),
      templates.listingRejectedEmail("Test", "reason"),
      templates.passwordResetEmail("https://example.com"),
      templates.emailVerificationEmail("https://example.com"),
    ];
    for (const { html } of results) {
      expect(html).toContain("ShtëpiAL");
      expect(html).toContain("#1B2A4A"); // navy
    }
  });
});
