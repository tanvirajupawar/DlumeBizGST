import { useState, useRef, useEffect } from "react";
import { HSN_MASTER } from "../components/Hsn_master";

export default function HSNSearchDropdown({ value, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }

    const lower = q.toLowerCase();
    const matched = HSN_MASTER.filter(
      (h) =>
        h.desc.toLowerCase().includes(lower) ||
        h.chapter.toLowerCase().includes(lower) ||
        h.code.startsWith(q.replace(/\s/g, ""))
    ).slice(0, 30);

    setResults(matched);
    setOpen(matched.length > 0);
  };

  const handleSelect = (item) => {
    setQuery(item.code);
    setOpen(false);
    onSelect(item);
  };

  const inp = {
    width: "100%",
    padding: "6px 8px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#111827",
    background: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search HSN..."
        style={inp}
        onFocus2={(e) => (e.target.style.borderColor = "#3b82f6")}
        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "8px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: "260px",
          overflowY: "auto", marginTop: "4px",
        }}>
          {results.map((h) => (
            <div
              key={h.code}
              onMouseDown={() => handleSelect(h)}
              style={{
                padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f3f4f6",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <div>
                <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#2563eb", fontWeight: 700 }}>
                  {h.code}
                </span>
                <span style={{ fontSize: "12px", color: "#374151", marginLeft: "8px" }}>
                  {h.desc.length > 55 ? h.desc.slice(0, 55) + "…" : h.desc}
                </span>
              </div>
              <span style={{
                fontSize: "11px", fontWeight: 700, padding: "2px 7px",
                borderRadius: "99px", background: "#f0fdf4", color: "#15803d",
                whiteSpace: "nowrap",
              }}>
                GST {h.gst}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}