"use client";

import { useState } from "react";

interface ContactFormProps {
  listingId: string;
  listingTitle: string;
}

export default function ContactForm({
  listingId,
  listingTitle,
}: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    `Jam i interesuar për: ${listingTitle}`
  );
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          sender_name: name,
          sender_email: email,
          sender_phone: phone || undefined,
          message,
          website: honeypot,
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "Ndodhi një gabim. Provoni përsëri.");
      }
    } catch {
      setError("Ndodhi një gabim. Provoni përsëri.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <svg
          className="mx-auto h-10 w-10 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-3 font-medium text-green-800">
          Mesazhi u dërgua me sukses!
        </p>
        <p className="mt-1 text-sm text-green-600">
          Do të kontaktoheni së shpejti.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-warm-gray-light/40 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-navy">
        Dërgo mesazh
      </h2>
      <p className="mt-1 text-sm text-warm-gray">
        Kontaktoni për më shumë informacion rreth këtij njoftimi.
      </p>

      {error && (
        <div className="mt-3 rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Honeypot — visually hidden, traps bots */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px" }}
        >
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="contact-name"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Emri juaj
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
            placeholder="Emri dhe mbiemri"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
            placeholder="email@shembull.com"
          />
        </div>

        <div>
          <label
            htmlFor="contact-phone"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Telefon{" "}
            <span className="font-normal text-warm-gray">(opsional)</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
            placeholder="+355 6X XXX XXXX"
          />
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Mesazhi
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            rows={4}
            className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md disabled:opacity-50"
        >
          {loading ? "Po dërgohet..." : "Dërgo mesazhin"}
        </button>
      </form>
    </div>
  );
}
