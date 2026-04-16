"use client";

const SORT_OPTIONS = [
  { value: "newest", label: "Më të rejat" },
  { value: "price_asc", label: "Çmimi: Ulët → Lartë" },
  { value: "price_desc", label: "Çmimi: Lartë → Ulët" },
  { value: "area_desc", label: "Sipërfaqja: Më e madhe" },
];

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Rendit sipas"
      className={className}
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
