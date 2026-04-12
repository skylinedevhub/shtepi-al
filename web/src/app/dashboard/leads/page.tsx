"use client";

import { useState, useEffect, useCallback } from "react";

interface Lead {
  id: string;
  listing_id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  message: string;
  status: string;
  lead_score: number | null;
  notes: string | null;
  contacted_at: string | null;
  converted_at: string | null;
  created_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "I ri",
  contacted: "Kontaktuar",
  qualified: "Kualifikuar",
  converted: "Konvertuar",
  lost: "Humbur",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-purple-100 text-purple-800",
  converted: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const SCORE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

function getScoreCategory(score: number | null): "high" | "medium" | "low" {
  if (score == null) return "low";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Gabim gjatë ngarkimit të leads.");
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        if (selectedLead?.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
      }
    } catch {
      // Silent
    }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch("/api/leads/export");
      if (res.status === 403) {
        setError("Eksporti CRM kërkon planin Growth ose më lart.");
        return;
      }
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Gabim gjatë eksportit.");
    }
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              Leads
            </h1>
            <p className="text-sm text-warm-gray">
              {total} leads gjithsej
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-cream transition hover:bg-navy/90"
          >
            Eksporto CSV
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 font-medium underline"
            >
              Mbyll
            </button>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {[null, "new", "contacted", "qualified", "converted", "lost"].map(
            (s) => (
              <button
                key={s ?? "all"}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  statusFilter === s
                    ? "bg-navy text-cream"
                    : "bg-white text-navy ring-1 ring-navy/10 hover:bg-navy/5"
                }`}
              >
                {s ? STATUS_LABELS[s] : "Të gjitha"}
              </button>
            )
          )}
        </div>

        {/* Lead table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-white"
              />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center">
            <p className="text-warm-gray">Nuk keni leads akoma.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
              >
                {/* Score badge */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    SCORE_COLORS[getScoreCategory(lead.lead_score)]
                  }`}
                >
                  {lead.lead_score ?? "–"}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-navy">
                      {lead.sender_name}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_COLORS[lead.status] ?? STATUS_COLORS.new
                      }`}
                    >
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </div>
                  <p className="truncate text-sm text-warm-gray">
                    {lead.message}
                  </p>
                </div>

                {/* Date */}
                <span className="hidden text-xs text-warm-gray sm:block">
                  {lead.created_at
                    ? new Date(lead.created_at).toLocaleDateString("sq-AL")
                    : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg bg-white px-3 py-1.5 text-sm text-navy ring-1 ring-navy/10 disabled:opacity-50"
            >
              Prapa
            </button>
            <span className="px-3 py-1.5 text-sm text-warm-gray">
              Faqja {page} nga {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="rounded-lg bg-white px-3 py-1.5 text-sm text-navy ring-1 ring-navy/10 disabled:opacity-50"
            >
              Para
            </button>
          </div>
        )}

        {/* Lead detail modal */}
        {selectedLead && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedLead(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy">
                    {selectedLead.sender_name}
                  </h2>
                  <p className="text-sm text-warm-gray">
                    {selectedLead.sender_email}
                    {selectedLead.sender_phone &&
                      ` · ${selectedLead.sender_phone}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-warm-gray hover:text-navy"
                >
                  ✕
                </button>
              </div>

              {/* Score */}
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-warm-gray">Pikët:</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-sm font-bold ${
                    SCORE_COLORS[getScoreCategory(selectedLead.lead_score)]
                  }`}
                >
                  {selectedLead.lead_score ?? "–"}
                </span>
              </div>

              {/* Message */}
              <div className="mb-4 rounded-lg bg-cream p-3">
                <p className="whitespace-pre-wrap text-sm text-navy">
                  {selectedLead.message}
                </p>
              </div>

              {/* Status actions */}
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-navy">
                  Ndryshoni statusin:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => updateLeadStatus(selectedLead.id, key)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selectedLead.status === key
                          ? STATUS_COLORS[key]
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact actions */}
              <div className="flex gap-2">
                {selectedLead.sender_phone && (
                  <a
                    href={`tel:${selectedLead.sender_phone}`}
                    className="flex-1 rounded-lg bg-navy py-2 text-center text-sm font-medium text-cream"
                  >
                    Telefono
                  </a>
                )}
                {selectedLead.sender_phone && (
                  <a
                    href={`https://wa.me/${selectedLead.sender_phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg bg-green-600 py-2 text-center text-sm font-medium text-white"
                  >
                    WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${selectedLead.sender_email}`}
                  className="flex-1 rounded-lg bg-warm-gray/20 py-2 text-center text-sm font-medium text-navy"
                >
                  Email
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
