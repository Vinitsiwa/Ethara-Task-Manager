import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import clsx from "clsx";
import { useClickOutside } from "./hooks";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function Select({
  options, value, onChange, placeholder = "Select…", searchable = false,
  disabled = false, error, className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useClickOutside(containerRef, () => { setOpen(false); setSearch(""); });

  const filtered = searchable && search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()) || (o.description?.toLowerCase().includes(search.toLowerCase())))
    : options;

  const selected = options.find((o) => o.value === value);

  const handleOpen = () => {
    if (disabled) return;
    setOpen((v) => !v);
    setSearch("");
    setFocusIdx(-1);
  };

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value);
    setOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setFocusIdx(0); }
    else if (e.key === "End") { e.preventDefault(); setFocusIdx(filtered.length - 1); }
    else if (e.key === "Enter" && focusIdx >= 0 && filtered[focusIdx]) { e.preventDefault(); handleSelect(filtered[focusIdx]); }
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-950/80 px-3 py-2.5 text-left text-sm transition",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/60",
          disabled && "cursor-not-allowed opacity-50",
          error ? "border-rose-500/70" : "border-slate-700 hover:border-slate-600"
        )}
      >
        <span className={selected ? "text-white" : "text-slate-500"}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {error && <p className="mt-1 text-xs text-rose-400">! {error}</p>}

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[160px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-fade-in"
        >
          {searchable && (
            <div className="border-b border-slate-800 p-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-2 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <input
                  ref={searchRef}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setFocusIdx(0); }}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">No options</li>
            )}
            {filtered.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isFocused = idx === focusIdx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt)}
                  className={clsx(
                    "flex cursor-pointer items-start gap-2 px-3 py-2 transition",
                    isSelected ? "bg-brand-600/20 text-brand-300" : "text-slate-200",
                    isFocused && !isSelected && "bg-slate-800",
                    "hover:bg-slate-800"
                  )}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand-400" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm">{opt.label}</p>
                    {opt.description && <p className="truncate text-xs text-slate-500">{opt.description}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
