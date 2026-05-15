import React, { useCallback, useEffect, useState } from "react";
import { apiFetch, readJsonSafe } from "../../utils/api";
import { toast } from "../../utils/toast";
import { hasAnyPermission } from "../../utils/usePermission";

const bigBtn = {
  width: "100%",
  maxWidth: 360,
  padding: "18px 20px",
  fontSize: 18,
  fontWeight: 800,
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  marginBottom: 12,
};

export default function AttendancePage() {
  const [today, setToday] = useState(null);
  const [list, setList] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const r = await apiFetch("/workforce-ops/attendance/me/today");
    const { ok, data } = await readJsonSafe(r, null);
    setToday(ok && data && typeof data === "object" && !Array.isArray(data) ? data : null);
  }, []);

  const loadList = useCallback(async () => {
    if (!hasAnyPermission("staff.view")) { setList([]); return; }
    const r = await apiFetch(`/workforce-ops/attendance?date=${encodeURIComponent(date)}`);
    const { ok, data } = await readJsonSafe(r, []);
    setList(ok && Array.isArray(data) ? data : []);
  }, [date]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadMe();
    await loadList();
    setLoading(false);
  }, [loadMe, loadList]);

  useEffect(() => { refresh(); }, [refresh]);

  const checkIn = async () => {
    const r = await apiFetch("/workforce-ops/attendance/me/check-in", { method: "POST" });
    const { ok, data: d } = await readJsonSafe(r, {});
    if (!ok) toast.error(d?.message || "Check-in failed");
    else { toast.success("Checked in"); refresh(); }
  };

  const checkOut = async () => {
    const r = await apiFetch("/workforce-ops/attendance/me/check-out", { method: "POST" });
    const { ok, data: d } = await readJsonSafe(r, {});
    if (!ok) toast.error(d?.message || "Check-out failed");
    else { toast.success("Checked out"); refresh(); }
  };

  const inProgress = today?.check_in_time && !today?.check_out_time;

  return (
    <div style={{ padding: "16px 18px", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Attendance</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>Browser check-in / check-out — no GPS or biometric.</p>

      {loading ? <p>Loading…</p> : (
        <div style={{ textAlign: "center" }}>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "left", fontSize: 14 }}>
            <div><strong>Today:</strong> {today?.attendance_date || date}</div>
            {today?.check_in_time && <div><strong>In:</strong> {new Date(today.check_in_time).toLocaleString("en-IN")}</div>}
            {today?.check_out_time && <div><strong>Out:</strong> {new Date(today.check_out_time).toLocaleString("en-IN")}</div>}
            {today?.total_hours != null && <div><strong>Total h:</strong> {today.total_hours}</div>}
            {today?.overtime_hours != null && <div><strong>OT h:</strong> {today.overtime_hours}</div>}
            <div><strong>Status:</strong> {today?.status || "—"}</div>
          </div>
          <button type="button" style={{ ...bigBtn, background: inProgress ? "#94a3b8" : "#15803d", color: "#fff" }} onClick={checkIn} disabled={inProgress}>
            Check in
          </button>
          <button type="button" style={{ ...bigBtn, background: !inProgress ? "#94a3b8" : "#1d4ed8", color: "#fff" }} onClick={checkOut} disabled={!inProgress}>
            Check out
          </button>
        </div>
      )}

      {hasAnyPermission("staff.view") && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16 }}>Team roster</h2>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
          <div style={{ overflowX: "auto", fontSize: 13 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#f1f5f9" }}><th style={{ padding: 8, textAlign: "left" }}>Name</th><th style={{ padding: 8 }}>Status</th><th style={{ padding: 8 }}>Hours</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: 8 }}>{r.user_name}</td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                    <td style={{ padding: 8 }}>{r.total_hours ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
