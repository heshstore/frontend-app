import React, { useState, useRef, useEffect, useCallback } from "react";
import { apiFetch } from "./utils/api";
import { theme, buttonStyle } from "./theme";
import PageLayout from "./components/layout/PageLayout";

const inp = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  fontSize: 15,
  boxSizing: "border-box",
  background: "#fff",
  color: theme.text,
};

const lbl = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: theme.textMuted,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const CREDIT_DAY_OPTIONS = [
  { value: 0,  label: "0 days — Due on delivery" },
  { value: 7,  label: "7 days" },
  { value: 15, label: "15 days" },
  { value: 30, label: "30 days" },
  { value: 45, label: "45 days" },
];

export default function SetCreditLimit() {
  // ── search state ──────────────────────────────────────────────────────────
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [showDrop, setShowDrop]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [expanded, setExpanded]   = useState(false);

  // ── form state ────────────────────────────────────────────────────────────
  const [creditLimit, setCreditLimit] = useState("");
  const [creditDays, setCreditDays]   = useState(15);
  const [isWholesaler, setIsWholesaler] = useState(false);

  // ── save state ────────────────────────────────────────────────────────────
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // ── wholesaler list ───────────────────────────────────────────────────────
  const [wholesalerList, setWholesalerList] = useState([]);
  const [loadingList, setLoadingList]       = useState(false);

  const wrapRef  = useRef(null);
  const timerRef = useRef(null);

  const loadWholesalers = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await apiFetch(`/customers`);
      const d = await r.json();
      setWholesalerList(Array.isArray(d) ? d.filter(c => c.isWholesaler) : []);
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadWholesalers(); }, [loadWholesalers]);

  // close dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); setShowDrop(false); return; }
    try {
      const r = await apiFetch(`/customers/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(Array.isArray(d) ? d.slice(0, 8) : []);
      setShowDrop(true);
    } catch (e) { console.error(e); }
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const selectCustomer = (c) => {
    setSelected(c);
    setQuery(`${c.companyName}${c.tag ? ` [${c.tag}]` : ""}${c.city ? ` — ${c.city}` : ""}`);
    setShowDrop(false);
    setResults([]);
    setExpanded(true);
    setSaved(false);
    // pre-fill from existing values
    setCreditLimit(c.creditLimit > 0 ? String(c.creditLimit) : "");
    setCreditDays(c.credit_days ?? 15);
    setIsWholesaler(!!c.isWholesaler);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setExpanded(false);
    setSaved(false);
    setCreditLimit("");
    setCreditDays(15);
    setIsWholesaler(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    if (creditLimit !== "" && isNaN(Number(creditLimit))) {
      alert("Credit Limit must be a number");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/customers/${selected.id}/credit-limit`, {
        method: "PATCH",
        body: JSON.stringify({
          credit_limit_amount: Number(creditLimit) || 0,
          credit_days: Number(creditDays),
          isWholesaler,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      // refresh selected object and wholesaler list
      const updated = await apiFetch(`/customers/${selected.id}`);
      const updatedData = await updated.json();
      setSelected(updatedData);
      loadWholesalers();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Is this customer's credit already configured?
  const isExisting = selected && (Number(selected.creditLimit) > 0 || selected.credit_days > 0 || selected.isWholesaler);

  return (
    <PageLayout title="Set Customer Credit Limit">
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 16px 60px" }}>

        {/* ── Customer Search ────────────────────────────────────────────── */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <label style={{ ...lbl, fontSize: 13, marginBottom: 8 }}>Search Customer</label>
          <div ref={wrapRef} style={{ position: "relative" }}>
            <input
              placeholder="Type company name, mobile, GST…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => results.length > 0 && setShowDrop(true)}
              autoComplete="off"
              style={{
                ...inp,
                paddingRight: selected ? 80 : 12,
                borderColor: selected
                  ? isExisting ? "#16a34a" : "#dc2626"
                  : theme.border,
                background: selected
                  ? isExisting ? "#f0fdf4" : "#fff5f5"
                  : "#fff",
              }}
            />

            {/* Status indicator pill */}
            {selected && (
              <span
                style={{
                  position: "absolute",
                  right: 40,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: isExisting ? "#dcfce7" : "#fee2e2",
                  color: isExisting ? "#15803d" : "#b91c1c",
                  pointerEvents: "none",
                }}
              >
                {isExisting ? "● Update" : "● New"}
              </span>
            )}

            {/* Clear button */}
            {selected && (
              <button
                type="button"
                onClick={clearSelection}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: theme.textMuted,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}

            {/* Dropdown */}
            {showDrop && results.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 9999,
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {results.map((c) => (
                  <div
                    key={c.id}
                    onMouseDown={() => selectCustomer(c)}
                    style={{
                      padding: "11px 14px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme.primaryLight)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>
                          {c.companyName}
                          {c.tag && (
                            <span style={{ marginLeft: 6, fontSize: 11, background: theme.primaryLight, color: theme.primary, borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                              {c.tag}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: theme.textMuted }}>
                          {[c.city, c.mobile1].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {/* indicator dot */}
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: (c.creditLimit > 0 || c.credit_days > 0 || c.isWholesaler) ? "#16a34a" : "#dc2626",
                          flexShrink: 0,
                        }}
                        title={(c.creditLimit > 0 || c.credit_days > 0 || c.isWholesaler) ? "Credit configured" : "Not configured"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Expanded Customer Detail + Form ───────────────────────────── */}
        {selected && expanded && (
          <div
            style={{
              background: "#fff",
              border: `1px solid ${isExisting ? "#86efac" : "#fca5a5"}`,
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            {/* Header strip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
                padding: "10px 14px",
                background: isExisting ? "#f0fdf4" : "#fff5f5",
                borderRadius: 8,
                border: `1px solid ${isExisting ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: isExisting ? "#16a34a" : "#dc2626",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>
                  {selected.companyName}
                  {selected.tag && (
                    <span style={{ marginLeft: 6, fontSize: 11, background: theme.primaryLight, color: theme.primary, borderRadius: 4, padding: "1px 6px" }}>
                      {selected.tag}
                    </span>
                  )}
                  {selected.isWholesaler && (
                    <span style={{ marginLeft: 6, fontSize: 11, background: "#fef9c3", color: "#a16207", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                      Wholesaler
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>
                  {[selected.customerType, selected.city, selected.mobile1].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isExisting ? "#15803d" : "#b91c1c",
                  background: isExisting ? "#dcfce7" : "#fee2e2",
                  padding: "3px 10px",
                  borderRadius: 10,
                }}
              >
                {isExisting ? "● Updating" : "● New Setup"}
              </div>
            </div>

            {/* Current values summary (only if existing) */}
            {isExisting && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 120, background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, marginBottom: 2 }}>CURRENT LIMIT</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                    {Number(selected.creditLimit) > 0 ? `₹${Number(selected.creditLimit).toLocaleString("en-IN")}` : "—"}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 120, background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, marginBottom: 2 }}>CURRENT DAYS</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                    {selected.credit_days > 0 ? `${selected.credit_days} days` : "0 (COD)"}
                  </div>
                </div>
              </div>
            )}

            {/* ── Credit Limit ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Credit Limit (₹)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={creditLimit}
                onChange={(e) => { setCreditLimit(e.target.value); setSaved(false); }}
                style={inp}
              />
            </div>

            {/* ── Credit Days ──────────────────────────────────────────── */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Credit Days</label>
              <select
                value={creditDays}
                onChange={(e) => { setCreditDays(Number(e.target.value)); setSaved(false); }}
                style={{ ...inp, cursor: "pointer" }}
              >
                {CREDIT_DAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* ── Wholesaler toggle ─────────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: isWholesaler ? "#fefce8" : "#f8fafc",
                border: `1px solid ${isWholesaler ? "#fde047" : theme.border}`,
                borderRadius: 10,
                marginBottom: 20,
                cursor: "pointer",
              }}
              onClick={() => { setIsWholesaler((v) => !v); setSaved(false); }}
            >
              {/* Radio circle */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `2px solid ${isWholesaler ? "#ca8a04" : theme.border}`,
                  background: isWholesaler ? "#ca8a04" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {isWholesaler && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>
                  Wholesale Customer
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>
                  {isWholesaler
                    ? "Wholesale price will be applied in Quotation, Order & Invoice"
                    : "Toggle on to apply wholesale pricing"}
                </div>
              </div>

              {isWholesaler && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#fef9c3",
                    color: "#a16207",
                    padding: "3px 10px",
                    borderRadius: 10,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>

            {/* ── Save button ──────────────────────────────────────────── */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...buttonStyle,
                width: "100%",
                padding: "13px 0",
                fontSize: 15,
                fontWeight: 700,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
                background: saved ? "#16a34a" : theme.primary,
                borderRadius: 10,
              }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved!" : isExisting ? "Update Credit Settings" : "Set Credit Limit"}
            </button>

            {saved && (
              <p style={{ textAlign: "center", color: "#16a34a", fontWeight: 600, marginTop: 10, fontSize: 13 }}>
                Credit settings updated for {selected.companyName}
              </p>
            )}
          </div>
        )}

        {/* Empty state hint */}
        {!selected && (
          <div
            style={{
              textAlign: "center",
              color: theme.textMuted,
              padding: "40px 20px",
              background: theme.surface,
              borderRadius: 12,
              border: `1px dashed ${theme.border}`,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Search for a customer</div>
            <div style={{ fontSize: 13 }}>
              Set credit limit, credit days, and wholesale pricing for any customer.
            </div>
          </div>
        )}
        {/* ── Wholesaler Customers List ────────────────────────────────── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: theme.border }} />
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#a16207",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              Active Wholesalers ({wholesalerList.length})
            </span>
            <div style={{ flex: 1, height: 1, background: theme.border }} />
          </div>

          {loadingList ? (
            <div style={{ textAlign: "center", color: theme.textMuted, padding: 20, fontSize: 13 }}>Loading…</div>
          ) : wholesalerList.length === 0 ? (
            <div style={{
              textAlign: "center", color: theme.textMuted, padding: "20px 16px",
              background: "#fefce8", borderRadius: 10, border: "1px dashed #fde047",
              fontSize: 13,
            }}>
              No wholesaler customers yet. Toggle "Wholesale Customer" above and save to add one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wholesalerList.map(c => (
                <div
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    background: "#fff",
                    border: "1px solid #fde047",
                    borderRadius: 10,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fefce8"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#ca8a04", flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>
                      {c.companyName}
                      {c.tag && (
                        <span style={{ marginLeft: 6, fontSize: 11, background: theme.primaryLight, color: theme.primary, borderRadius: 4, padding: "1px 6px" }}>
                          {c.tag}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>
                      {[c.city, c.mobile1].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    {Number(c.creditLimit) > 0 && (
                      <div style={{ fontWeight: 600, color: theme.text }}>
                        ₹{Number(c.creditLimit).toLocaleString("en-IN")}
                      </div>
                    )}
                    {c.credit_days > 0 && (
                      <div style={{ color: theme.textMuted }}>{c.credit_days}d credit</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                    background: "#fef9c3", color: "#a16207", flexShrink: 0,
                  }}>
                    WHOLESALER
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
