import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";
import { hasAnyPermission } from "../../utils/usePermission";

const input = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };

export default function ShiftMasterPage() {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ shiftName: "", startTime: "09:00", endTime: "18:00", breakMinutes: 60 });

  const load = useCallback(async () => {
    const r = await apiFetch("/workforce-ops/shifts?all=1");
    setRows(r.ok ? await r.json() : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const r = await apiFetch("/workforce-ops/shifts", {
      method: "POST",
      body: JSON.stringify({
        shiftName: f.shiftName,
        startTime: f.startTime,
        endTime: f.endTime,
        breakMinutes: Number(f.breakMinutes) || 0,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) toast.error(d.message || "Failed");
    else { toast.success("Shift added"); setF({ shiftName: "", startTime: "09:00", endTime: "18:00", breakMinutes: 60 }); load(); }
  };

  return (
    <div style={{ padding: "16px 18px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Shift master</h1>
      {hasAnyPermission("staff.edit") && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Add shift</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input style={input} placeholder="Name" value={f.shiftName} onChange={(e) => setF((p) => ({ ...p, shiftName: e.target.value }))} />
            <input style={input} type="number" placeholder="Break min" value={f.breakMinutes} onChange={(e) => setF((p) => ({ ...p, breakMinutes: e.target.value }))} />
            <input style={input} type="time" value={f.startTime} onChange={(e) => setF((p) => ({ ...p, startTime: e.target.value }))} />
            <input style={input} type="time" value={f.endTime} onChange={(e) => setF((p) => ({ ...p, endTime: e.target.value }))} />
          </div>
          <button type="button" onClick={add} style={{ marginTop: 10, padding: "9px 16px", borderRadius: 8, border: "none", background: "#b45309", color: "#fff", fontWeight: 700 }}>Save</button>
        </div>
      )}
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
        <thead><tr style={{ background: "#f8fafc" }}><th style={{ padding: 8, textAlign: "left" }}>Name</th><th style={{ padding: 8 }}>Start</th><th style={{ padding: 8 }}>End</th><th style={{ padding: 8 }}>Break</th><th style={{ padding: 8 }}>Active</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 8 }}>{s.shift_name}</td>
              <td style={{ padding: 8 }}>{String(s.start_time).slice(0, 5)}</td>
              <td style={{ padding: 8 }}>{String(s.end_time).slice(0, 5)}</td>
              <td style={{ padding: 8 }}>{s.break_minutes}</td>
              <td style={{ padding: 8 }}>{s.active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
