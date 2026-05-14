import React, { useState, useEffect, useRef } from "react";
import { HiOutlineCalendar } from "react-icons/hi";
import { HiChevronDown } from "react-icons/hi";

export const DEFAULT_FILTERS = [
    "All","Today", "Yesterday", "This Week", "Last Week", "Last 7 Days",
  "This Month", "Previous Month", "Last 30 Days", "This Quarter",
  "Previous Quarter", "Current Fiscal Year", "Previous Fiscal Year",
  "Last 365 Days",
];

export function getDateBounds(filter) {
  const today = new Date();
  let from, to;
  switch (filter) {
    case "Today":        from = to = new Date(); break;
    case "Yesterday":    from = to = new Date(new Date().setDate(today.getDate() - 1)); break;
    case "This Week": {
      from = new Date(); from.setDate(today.getDate() - today.getDay() + 1);
      to = new Date(from); to.setDate(from.getDate() + 6); break;
    }
    case "Last Week": {
      from = new Date(); from.setDate(today.getDate() - today.getDay() - 6);
      to   = new Date(); to.setDate(today.getDate() - today.getDay()); break;
    }
    case "Last 7 Days":   from = new Date(today); from.setDate(today.getDate() - 6);   to = today; break;
    case "Last 30 Days":  from = new Date(today); from.setDate(today.getDate() - 29);  to = today; break;
    case "Last 365 Days": from = new Date(today); from.setDate(today.getDate() - 364); to = today; break;
    case "This Month":    from = new Date(today.getFullYear(), today.getMonth(), 1);    to = today; break;
    case "Previous Month":
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to   = new Date(today.getFullYear(), today.getMonth(), 0); break;
    case "This Quarter": {
      const q = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), q * 3, 1); to = today; break;
    }
    case "Previous Quarter": {
      const q = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), (q - 1) * 3, 1);
      to   = new Date(today.getFullYear(), q * 3, 0); break;
    }
    case "Current Fiscal Year": {
      const yr = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      from = new Date(yr, 3, 1); to = today; break;
    }
    case "Previous Fiscal Year": {
      const yr = today.getMonth() >= 3 ? today.getFullYear() - 1 : today.getFullYear() - 2;
      from = new Date(yr, 3, 1); to = new Date(yr + 1, 2, 31); break;
    }
    default: return null;
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function getDateRangeLabel(filter) {
  const b = getDateBounds(filter);
  if (!b) return "";
  const f = (d) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${f(b.from)} – ${f(b.to)}`;
}

export function applyDateFilter(data, field, filter) {
  const bounds = getDateBounds(filter);
  if (!bounds) return data;
  const { from, to } = bounds;
  return data.filter((item) => {
    const raw = typeof field === "function" ? field(item) : item[field];
    const d = new Date(raw);
    if (isNaN(d)) return false;
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return (
      day >= new Date(from.getFullYear(), from.getMonth(), from.getDate()) &&
      day <= new Date(to.getFullYear(), to.getMonth(), to.getDate())
    );
  });
}

const DateFilter = ({
  value,
  onChange,
  filters = DEFAULT_FILTERS,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const ref = useRef();

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 hover:border-gray-300 transition-colors"
      >
        <HiOutlineCalendar size={14} className="text-gray-400" />
        <span className="font-medium">{value}</span>
        <HiChevronDown size={12} className="text-gray-400 ml-0.5" />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] overflow-hidden">
          <div className="px-3.5 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100">
            Select date range
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filters.map((f) => (
              <div
                key={f}
                onMouseEnter={() => setHovered(f)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { onChange(f); setOpen(false); }}
                className={`flex items-center justify-between px-3.5 py-2.5 text-sm cursor-pointer transition-colors
                  ${value === f
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <span>{f}</span>
                <span
                  className="text-[10.5px] text-gray-400 transition-opacity duration-150 ml-2 text-right whitespace-nowrap"
                  style={{ opacity: hovered === f || value === f ? 1 : 0 }}
                >
                  {getDateRangeLabel(f)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;