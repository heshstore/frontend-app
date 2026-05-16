import React from "react";

const rowStyle = { display: "flex", gap: 8, fontSize: 13, marginBottom: 4 };
const labelStyle = { color: "#64748b", minWidth: 110, fontWeight: 600 };
const valueStyle = { color: "#0f172a", fontWeight: 500 };

/** Compact ownership / actor block for detail pages and cards. */
export default function OwnershipMeta({ items = [] }) {
  const visible = items.filter((i) => i?.value);
  if (!visible.length) return null;
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 14,
      }}
    >
      {visible.map(({ label, value }) => (
        <div key={label} style={rowStyle}>
          <span style={labelStyle}>{label}</span>
          <span style={valueStyle}>{value}</span>
        </div>
      ))}
    </div>
  );
}
