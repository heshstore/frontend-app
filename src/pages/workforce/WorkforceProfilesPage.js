import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";
import { hasAnyPermission } from "../../utils/usePermission";

const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 14 };
const input = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };

export default function WorkforceProfilesPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({
    userId: "", employeeCode: "", departmentId: "", shiftMasterId: "", shiftType: "", designation: "", joiningDate: "",
    dailyWorkingHours: "8", overtimeEligible: true,
  });

  const load = useCallback(async () => {
    const [r, u, d, s] = await Promise.all([
      apiFetch("/workforce-ops/profiles").then((x) => (x.ok ? x.json() : [])),
      apiFetch("/users/dropdown").then((x) => (x.ok ? x.json() : [])),
      apiFetch("/departments").then((x) => (x.ok ? x.json() : [])),
      apiFetch("/workforce-ops/shifts").then((x) => (x.ok ? x.json() : [])),
    ]);
    setRows(Array.isArray(r) ? r : []);
    setUsers(Array.isArray(u) ? u : []);
    setDepts(Array.isArray(d) ? d : []);
    setShifts(Array.isArray(s) ? s : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const res = await apiFetch("/workforce-ops/profiles", {
      method: "POST",
      body: JSON.stringify({
        userId: Number(f.userId),
        employeeCode: f.employeeCode,
        departmentId: f.departmentId ? Number(f.departmentId) : null,
        shiftMasterId: f.shiftMasterId ? Number(f.shiftMasterId) : null,
        shiftType: f.shiftType || null,
        designation: f.designation || null,
        joiningDate: f.joiningDate || null,
        dailyWorkingHours: Number(f.dailyWorkingHours) || 8,
        overtimeEligible: f.overtimeEligible,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d.message || "Save failed"); return; }
    toast.success("Profile created");
    setModal(false);
    load();
  };

  return (
    <div style={{ padding: "16px 18px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Workforce profiles</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>Links ERP users to departments and shifts (no duplicate employee master).</p>
      {hasAnyPermission("staff.edit") && (
        <button type="button" onClick={() => setModal(true)} style={{ marginBottom: 12, padding: "9px 16px", borderRadius: 8, border: "none", background: "#005fb8", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          + Add profile
        </button>
      )}
      <div style={{ ...card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Code</th>
              <th style={{ padding: 8 }}>User</th>
              <th style={{ padding: 8 }}>Dept</th>
              <th style={{ padding: 8 }}>Shift</th>
              <th style={{ padding: 8 }}>Hours</th>
              <th style={{ padding: 8 }}>OT</th>
              <th style={{ padding: 8 }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 8, fontWeight: 700 }}>{r.employee_code}</td>
                <td style={{ padding: 8 }}>{r.user_name}</td>
                <td style={{ padding: 8 }}>{r.department_name || "—"}</td>
                <td style={{ padding: 8 }}>{r.shift_name || r.shift_type || "—"}</td>
                <td style={{ padding: 8 }}>{r.daily_working_hours}</td>
                <td style={{ padding: 8 }}>{r.overtime_eligible ? "Yes" : "No"}</td>
                <td style={{ padding: 8 }}>{r.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setModal(false)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, width: 440, maxWidth: "94vw" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>New profile</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <label>User<select style={input} value={f.userId} onChange={(e) => setF((p) => ({ ...p, userId: e.target.value }))}><option value="">—</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select></label>
              <label>Employee code<input style={input} value={f.employeeCode} onChange={(e) => setF((p) => ({ ...p, employeeCode: e.target.value }))} /></label>
              <label>Department<select style={input} value={f.departmentId} onChange={(e) => setF((p) => ({ ...p, departmentId: e.target.value }))}><option value="">—</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
              <label>Shift<select style={input} value={f.shiftMasterId} onChange={(e) => setF((p) => ({ ...p, shiftMasterId: e.target.value }))}><option value="">—</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}</select></label>
              <label>Daily hours<input style={input} value={f.dailyWorkingHours} onChange={(e) => setF((p) => ({ ...p, dailyWorkingHours: e.target.value }))} /></label>
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setModal(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}>Cancel</button>
              <button type="button" onClick={save} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#005fb8", color: "#fff", fontWeight: 700 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
