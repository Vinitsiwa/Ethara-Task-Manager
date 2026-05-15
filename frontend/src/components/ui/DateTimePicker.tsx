import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import clsx from "clsx";
import { useClickOutside, useKey } from "./hooks";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function buildCalendar(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return cells;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface StepperProps { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; }

function Stepper({ label, value, min, max, step = 1, onChange }: StepperProps) {
  const inc = () => onChange(value + step > max ? min : value + step);
  const dec = () => onChange(value - step < min ? max : value - step);
  const handleInput = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
  };
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <button type="button" onClick={inc} className="flex h-6 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition">
        ▲
      </button>
      <input
        className="w-10 rounded-md bg-slate-800 py-1 text-center text-sm font-semibold text-white outline-none ring-1 ring-slate-700 focus:ring-brand-500/60"
        value={pad(value)}
        onChange={(e) => handleInput(e.target.value)}
      />
      <button type="button" onClick={dec} className="flex h-6 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition">
        ▼
      </button>
    </div>
  );
}

export interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disablePast?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function DateTimePicker({
  value, onChange, placeholder = "Pick date & time", disablePast = true, disabled = false, error, className,
}: DateTimePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value?.getMonth() ?? today.getMonth());
  const [year, setYear] = useState(value?.getFullYear() ?? today.getFullYear());
  const [hours, setHours] = useState(value?.getHours() ?? today.getHours());
  const [minutes, setMinutes] = useState(value ? Math.round(value.getMinutes() / 5) * 5 : 0);

  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useKey("Escape", () => { if (open) setOpen(false); });
  useClickOutside(panelRef as React.RefObject<HTMLElement>, () => setOpen(false));

  const positionPanel = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelH = 440;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top = spaceBelow >= panelH || spaceBelow > (rect.top - 8)
      ? rect.bottom + window.scrollY + 6
      : rect.top + window.scrollY - panelH - 6;
    setDropStyle({ position: "absolute", top, left: rect.left + window.scrollX, width: Math.max(rect.width, 300), zIndex: 9999 });
  }, []);

  useEffect(() => {
    if (!open) return;
    positionPanel();
    window.addEventListener("scroll", positionPanel, true);
    window.addEventListener("resize", positionPanel);
    return () => { window.removeEventListener("scroll", positionPanel, true); window.removeEventListener("resize", positionPanel); };
  }, [open, positionPanel]);

  useEffect(() => {
    if (value) { setMonth(value.getMonth()); setYear(value.getFullYear()); setHours(value.getHours()); setMinutes(Math.round(value.getMinutes() / 5) * 5); }
  }, [value]);

  const cells = buildCalendar(year, month);

  const selectDay = (day: Date) => {
    if (disablePast && day < today) return;
    const d = new Date(day);
    d.setHours(hours, minutes, 0, 0);
    onChange(d);
    setOpen(false);
  };

  const handleNow = () => {
    const now = new Date();
    setMonth(now.getMonth()); setYear(now.getFullYear());
    setHours(now.getHours()); setMinutes(Math.round(now.getMinutes() / 5) * 5);
    onChange(now);
    setOpen(false);
  };

  const formatted = value
    ? `${value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${pad(value.getHours())}:${pad(value.getMinutes())}`
    : "";

  return (
    <>
      <div className={clsx("relative", className)}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/60",
            disabled && "cursor-not-allowed opacity-50",
            error ? "border-rose-500/70 bg-slate-950/80" : "border-slate-700 bg-slate-950/80 hover:border-slate-600"
          )}
        >
          <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
          <span className={clsx("flex-1 truncate", value ? "text-white" : "text-slate-500")}>
            {value ? formatted : placeholder}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(null); } }}
              className="text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={clsx("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
        </button>
        {error && <p className="mt-1 text-xs text-rose-400">! {error}</p>}
      </div>

      {open && createPortal(
        <div ref={panelRef} style={dropStyle} className="animate-fade-in rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-white">{MONTHS[month]} {year}</span>
            <button type="button" onClick={() => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {DAYS.map((d) => <span key={d} className="py-1 text-[11px] font-medium text-slate-500">{d}</span>)}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              const isCurrentMonth = day.getMonth() === month;
              const isToday = isSameDay(day, new Date());
              const isSelected = value ? isSameDay(day, value) : false;
              const isPast = disablePast && day < today;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast}
                  onClick={() => selectDay(day)}
                  className={clsx(
                    "h-8 w-full rounded-full text-xs font-medium transition",
                    isPast && "cursor-not-allowed text-slate-700",
                    !isPast && !isSelected && isCurrentMonth && "text-slate-300 hover:bg-slate-700",
                    !isPast && !isSelected && !isCurrentMonth && "text-slate-600 hover:bg-slate-800",
                    isToday && !isSelected && "ring-2 ring-brand-500/60",
                    isSelected && "bg-brand-600 text-white ring-2 ring-brand-500/80"
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time section */}
          <div className="mt-4 flex items-center justify-center gap-4 rounded-xl bg-slate-800/60 py-3">
            <Clock className="h-4 w-4 text-slate-500" />
            <Stepper label="HH" value={hours} min={0} max={23} onChange={setHours} />
            <span className="text-lg font-bold text-slate-500">:</span>
            <Stepper label="MM" value={minutes} min={0} max={55} step={5} onChange={setMinutes} />
          </div>

          {/* Footer */}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleNow} className="flex-1 rounded-xl bg-slate-800 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition">
              Now
            </button>
            <button
              type="button"
              onClick={() => {
                if (value) {
                  const d = new Date(value);
                  d.setHours(hours, minutes, 0, 0);
                  onChange(d);
                }
                setOpen(false);
              }}
              className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
