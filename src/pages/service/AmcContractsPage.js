import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

export default function AmcContractsPage() {
  const [rows, setRows] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    customerId: "", orderId: "", startDate: "", endDate: "", visitFrequency: "QUARTERLY",
    coveredItems: "", notes: "",
  });

  const load = useCallback(() => {
    apiFetch("/after-sales/amc")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => toast.error("Failed to load AMC"));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    let covered = [];
    if (form.coveredItems.trim()) {
      try { covered = JSON.parse(form.coveredItems.startsWith("[") ? form.coveredItems : `[${form.coveredItems}]`); }
      catch { toast.error("coveredItems must be JSON array of item ids e.g. [1,2,3]"); return; }
    }
    const res = await apiFetch("/after-sales/amc", {
      method: "POST",
      body: JSON.stringify({
        customerId: +form.customerId,
        orderId: form.orderId ? +form.orderId : null,
        startDate: form.startDate,
        endDate: form.endDate,
        visitFrequency: form.visitFrequency,
        coveredItems: covered,
        notes: form.notes || undefined,
      }),
    });
    if (!res.ok) toast.error("Save failed");
    else { toast.success("AMC saved"); setShow(false); load(); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22 }}>AMC contracts</h1>
        <button type="button" onClick={() => setShow(true)} style={{ padding: "8px 14px", fontWeight: 700, background: "#005fb8", color: "#fff", border: "none", borderRadius: 8 }}>New AMC</button>
      </div>
      {show && (
        <form onSubmit={save} style={{ marginTop: 16, padding: 16, background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>Customer id *<input required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Order id<input value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Start *<input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>End *<input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Visit frequency<input value={form.visitFrequency} onChange={(e) => setForm({ ...form, visitFrequency: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Covered item ids (JSON array)<input value={form.coveredItems} onChange={(e) => setForm({ ...form, coveredItems: e.target.value })} placeholder='[101,102]' style={{ width: "100%", marginTop: 4 }} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ width: "100%", marginTop: 4 }} rows={2} /></label>
          </div>
          <button type="submit" style={{ marginTop: 12, padding: "8px 16px", fontWeight: 700 }}>Save</button>
        </form>
      )}
      <table style={{ width: "100%", marginTop: 20, fontSize: 13, borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}><th style={{ padding: 8 }}>ID</th><th>Customer</th><th>Period</th><th>Status</th><th>Items</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>{r.id}</td>
              <td>{r.customerId}</td>
              <td>{r.startDate} → {r.endDate}</td>
              <td>{r.status}</td>
              <td style={{ fontFamily: "monospace", fontSize: 11 }}>{JSON.stringify(r.coveredItems)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
