import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

export default function ServiceDashboardPage() {
  const [d, setD] = useState(null);
  const load = useCallback(() => {
    apiFetch("/after-sales/dashboard")
      .then((r) => r.json())
      .then(setD)
      .catch(() => toast.error("Failed to load dashboard"));
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div style={{ padding: 24 }}>Loading…</div>;
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22 }}>Service dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b" }}>Open pipeline</div><div style={{ fontSize: 28, fontWeight: 900 }}>{d.openTickets}</div></div>
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b" }}>Waiting parts</div><div style={{ fontSize: 28, fontWeight: 900 }}>{d.waitingParts}</div></div>
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #fca5a5" }}><div style={{ fontSize: 11, color: "#64748b" }}>Overdue (&gt;7d)</div><div style={{ fontSize: 28, fontWeight: 900 }}>{d.overdueTickets}</div></div>
      </div>
      <h2 style={{ marginTop: 28, fontSize: 16 }}>Technician workload</h2>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginTop: 8 }}>
        <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}><th style={{ padding: 8 }}>Technician</th><th>Open assignments</th></tr></thead>
        <tbody>
          {(d.technicianWorkload || []).map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 8 }}>{r.userName || r.userId}</td><td>{r.cnt}</td></tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ marginTop: 28, fontSize: 16 }}>AMC renewals (30 days)</h2>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginTop: 8 }}>
        <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}><th style={{ padding: 8 }}>Contract</th><th>Customer</th><th>End</th></tr></thead>
        <tbody>
          {(d.amcRenewalsDue || []).map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>#{r.id}</td>
              <td>{r.customerId}</td>
              <td>{r.endDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ marginTop: 28, fontSize: 16 }}>Repeat complaints (same customer + item)</h2>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginTop: 8 }}>
        <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}><th style={{ padding: 8 }}>Customer</th><th>Item</th><th>Count</th></tr></thead>
        <tbody>
          {(d.repeatComplaintPairs || []).map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 8 }}>{r.customerId}</td><td>{r.itemId}</td><td>{r.cnt}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
