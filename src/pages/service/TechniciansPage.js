import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

export default function TechniciansPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ userId: "", department: "", specialization: "", remarks: "" });

  const load = useCallback(() => {
    apiFetch("/after-sales/technicians")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => toast.error("Failed to load technicians"));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/after-sales/technicians", {
      method: "POST",
      body: JSON.stringify({
        userId: +form.userId,
        department: form.department || undefined,
        specialization: form.specialization || undefined,
        remarks: form.remarks || undefined,
      }),
    });
    if (!res.ok) toast.error("Save failed");
    else { toast.success("Technician profile saved"); setForm({ userId: "", department: "", specialization: "", remarks: "" }); load(); }
  };

  const deactivate = async (userId) => {
    if (!window.confirm("Deactivate this technician profile?")) return;
    const res = await apiFetch(`/after-sales/technicians/${userId}`, { method: "DELETE" });
    if (!res.ok) toast.error("Failed");
    else load();
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22 }}>Technician profiles</h1>
      <p style={{ color: "#64748b", fontSize: 14 }}>Links staff users (from <strong>Staff</strong>) to field-service metadata. Service tickets can only be assigned to active technicians.</p>
      <form onSubmit={save} style={{ marginTop: 16, padding: 16, background: "#f8fafc", borderRadius: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label>User id *<input required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
        <label>Department<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Specialization<input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Remarks<textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} style={{ width: "100%", marginTop: 4 }} rows={2} /></label>
        <button type="submit" style={{ gridColumn: "1 / -1", padding: "10px", fontWeight: 800 }}>Save / update profile</button>
      </form>
      <table style={{ width: "100%", marginTop: 24, fontSize: 13, borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}><th style={{ padding: 8 }}>User</th><th>Dept</th><th>Specialization</th><th>Active</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>{r.userName} (#{r.user_id})</td>
              <td>{r.department}</td>
              <td>{r.specialization}</td>
              <td>{r.active ? "Yes" : "No"}</td>
              <td>{r.active && <button type="button" onClick={() => deactivate(r.user_id)} style={{ color: "#b91c1c" }}>Deactivate</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
