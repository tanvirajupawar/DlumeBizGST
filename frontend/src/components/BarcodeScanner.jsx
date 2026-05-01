import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onScan, onClose }) {
  const inputRef = useRef(null);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState("");

  // Auto-focus so USB/Bluetooth barcode scanners type directly into the input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    // Most barcode scanners send Enter after the code
    if (e.key === "Enter" && manualCode.trim()) {
      submit(manualCode.trim());
    }
  };

  const submit = (code) => {
    setLastScanned(code);
    onScan(code);
    setManualCode("");
    inputRef.current?.focus();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "460px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden"
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 22px", borderBottom: "1px solid #e5e7eb",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M3 9V6a1 1 0 0 1 1-1h3M15 5h3a1 1 0 0 1 1 1v3M21 15v3a1 1 0 0 1-1 1h-3M9 21H6a1 1 0 0 1-1-1v-3"/>
                <line x1="7" y1="12" x2="7" y2="12.01"/><line x1="10" y1="9" x2="10" y2="15"/>
                <line x1="13" y1="9" x2="13" y2="15"/><line x1="16" y1="12" x2="16" y2="12.01"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#111827" }}>Scan Barcode</div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>Scan or type barcode / SKU</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: "22px",
            color: "#9ca3af", cursor: "pointer", lineHeight: 1
          }}>×</button>
        </div>

        {/* Scanner area */}
        <div style={{ padding: "24px 22px" }}>

          {/* Animated scan graphic */}
          <div style={{
            border: "2px dashed #bfdbfe", borderRadius: "12px",
            padding: "28px 20px", textAlign: "center", background: "#f8fbff",
            marginBottom: "20px", position: "relative", overflow: "hidden"
          }}>
            <div style={{
              width: "140px", height: "70px", margin: "0 auto 12px",
              display: "flex", alignItems: "flex-end", gap: "3px", justifyContent: "center"
            }}>
              {[8,14,6,18,10,14,6,8,18,10,6,14,8].map((h, i) => (
                <div key={i} style={{
                  width: "5px", height: `${h * 3}px`,
                  background: "#1e3a5f", borderRadius: "1px", opacity: 0.85
                }} />
              ))}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              Point your scanner at the barcode
            </div>
            <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
              or type SKU / code below
            </div>

            {/* scan line animation */}
            <style>{`
              @keyframes scanline {
                0%   { top: 20%; opacity: 1; }
                50%  { top: 75%; opacity: 1; }
                100% { top: 20%; opacity: 1; }
              }
              .scan-line {
                position: absolute; left: 10%; right: 10%; height: "2px";
                background: linear-gradient(90deg, transparent, #3b82f6, transparent);
                animation: scanline 2s ease-in-out infinite;
                pointer-events: none;
              }
            `}</style>
            <div className="scan-line" style={{ height: "2px" }} />
          </div>

          {/* Input — barcode scanner types here */}
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Barcode / SKU will appear here..."
              style={{
                width: "100%", padding: "11px 44px 11px 14px",
                border: "2px solid #3b82f6", borderRadius: "8px",
                fontSize: "14px", color: "#111827", outline: "none",
                boxSizing: "border-box", fontFamily: "monospace", fontWeight: 600,
                background: "#f0f7ff"
              }}
            />
            {manualCode && (
              <button onClick={() => submit(manualCode.trim())} style={{
                position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                background: "#2563eb", border: "none", borderRadius: "5px",
                color: "#fff", fontSize: "11px", fontWeight: 700, padding: "4px 8px",
                cursor: "pointer", fontFamily: "inherit"
              }}>GO</button>
            )}
          </div>

          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>
            Press <kbd style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "3px", padding: "1px 5px", fontSize: "10px" }}>Enter</kbd> after typing to add item
          </div>

          {/* Last scanned */}
          {lastScanned && (
            <div style={{
              marginTop: "16px", padding: "10px 14px", background: "#f0fdf4",
              border: "1px solid #86efac", borderRadius: "8px",
              display: "flex", alignItems: "center", gap: "8px"
            }}>
              <span style={{ fontSize: "16px" }}>✓</span>
              <div>
                <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>Last scanned</div>
                <div style={{ fontSize: "13px", fontFamily: "monospace", color: "#111827", fontWeight: 600 }}>{lastScanned}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: "12px 22px", borderTop: "1px solid #e5e7eb",
          background: "#fafafa", display: "flex", justifyContent: "flex-end"
        }}>
          <button onClick={onClose} style={{
            padding: "8px 20px", border: "1.5px solid #d1d5db", borderRadius: "7px",
            background: "#fff", fontSize: "13px", fontWeight: 600, color: "#374151",
            cursor: "pointer", fontFamily: "inherit"
          }}>Done</button>
        </div>
      </div>
    </div>
  );
}