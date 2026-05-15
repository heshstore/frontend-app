import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";
import { hasAnyPermission } from "../../utils/usePermission";

const input = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };

export default function LeaveRequestsPage() {
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [f, setF] = useState({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "" });
  let myUserId = null;
  try { myUserId = JSON.parse(localStorage.getItem("user") || "{}").id; } catch {}

  const load = useCallback(async () => {
    const m = await apiFetch("/workforce-ops/leave-requests/mine").then((r) => (r.ok ? r.json() : []));
    setMine(Array.isArray(m) ? m : []);
    if (hasAnyPermission("staff.view")) {
      const a = await apiFetch("/workforce-ops/leave-requests").then((r) => (r.ok ? r.json() : []));
      setAll(Array.isArray(a) ? a : []);
    } else setAll([]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const r = await apiFetch("/workforce-ops/leave-requests", {
      method: "POST",
      body: JSON.stringify({ leaveType: f.leaveType, fromDate: f.fromDate, toDate: f.toDate, reason: f.reason }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) toast.error(d.message || "Failed");
    else { toast.success("Leave submitted"); setF({ ...f, fromDate: "", toDate: "", reason: "" }); load(); }
  };

  return (
    <div style={{ padding: "16px 18px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Leave requests</h1>

      <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>New request</div>
        <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
          <select style={input} value={f.leaveType} onChange={(e) => setF((p) => ({ ...p, leaveType: e.target.value }))}>
            {["CASUAL", "SICK", "EMERGENCY", "UNPAID"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input style={input} type="date" required value={f.fromDate} onChange={(e) => setF((p) => ({ ...p, fromDate: e.target.value }))} />
          <input style={input} type="date" required value={f.toDate} onChange={(e) => setF((p) => ({ ...p, toDate: e.target.value }))} />
          <textarea style={{ ...input, minHeight: 56 }} placeholder="Reason" value={f.reason} onChange={(e) => setF((p) => ({ ...p, reason: e.target.value }))} />
          <button type="submit" style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700 }}>Submit</button>
        </div>
      </form>

      <h2 style={{ fontSize: 16 }}>My requests</h2>
      <ul style={{ fontSize: 13 }}>{mine.map((lr) => <li key={lr.id}>{lr.leave_type} {String(lr.from_date).slice(0,10)}–{String(lr.to_date).slice(0,10)} · {lr.status}</li>)}</ul>

      {hasAnyPermission("staff.view") && (
        <>
          <h2 style={{ fontSize: 16 }}>All (HR view)</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}><th style={{ padding: 8, textAlign: "left" }}>User</th><th style={{ padding: 8 }}>Type</th><th style={{ padding: 8 }}>Dates</th><th style={{ padding: 8 }}>Status</th><th style={{ padding: 8 }} /></tr></thead>
            <tbody>
              {all.map((lr) => (
                <tr key={lr.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{lr.user_name}</td>
                  <td style={{ padding: 8 }}>{lr.leave_type}</td>
                  <td style={{ padding: 8 }}>{String(lr.from_date).slice(0,10)} → {String(lr.to_date).slice(0,10)}</td>
                  <td style={{ padding: 8 }}>{lr.status}</td>
                  <td style={{ padding: 8 }}>
                    {lr.status === "PENDING" && hasAnyPermission("staff.edit") && (
                      <>
                        <button type="button" style={{ marginRight: 6, padding: "4px 8px", background: "#15803d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }} onClick={() => act(`/workforce-ops/leave-requests/${lr.id}/approve`, load)}>OK</button>
                        <button type="button" style={{ padding: "4px 8px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }} onClick={() => act(`/workforce-ops/leave-requests/${lr.id}/reject`, load)}>No</button>
                      </>
                    )}
                    {lr.status === "PENDING" && myUserId && lr.user_id === myUserId && (
                      <button type="button" style={{ marginLeft: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer" }} onClick={() => act(`/workforce-ops/leave-requests/${lr.id}/cancel`, load)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

async function act(url, reload) {
  const r = await apiFetch(url, { method: "POST" });
  if (!r.ok) toast.error("Action failed");
  else { toast.success("Done"); reload(); }
}
