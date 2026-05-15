import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "RESOLVED", "CLOSED", "CANCELLED"];
const TYPES = ["COMPLAINT", "INSTALLATION", "REPAIR", "AMC_VISIT", "DEMO", "INSPECTION"];
const PRI = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function TicketList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    customerId: "", orderId: "", dispatchOrderId: "", itemId: "",
    issueType: "", issueDescription: "", priority: "MEDIUM", serviceType: "COMPLAINT",
    assignedTo: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/after-sales/tickets?limit=200")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => toast.error("Could not load tickets"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try {
      const body = {
        customerId: +form.customerId,
        itemId: +form.itemId,
        priority: form.priority,
        serviceType: form.serviceType,
        issueType: form.issueType || undefined,
        issueDescription: form.issueDescription || undefined,
        orderId: form.orderId ? +form.orderId : null,
        dispatchOrderId: form.dispatchOrderId ? +form.dispatchOrderId : null,
        assignedTo: form.assignedTo ? +form.assignedTo : null,
      };
      const res = await apiFetch("/after-sales/tickets", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || res.status);
      toast.success("Ticket created");
      setShow(false);
      setForm({
        customerId: "", orderId: "", dispatchOrderId: "", itemId: "",
        issueType: "", issueDescription: "", priority: "MEDIUM", serviceType: "COMPLAINT", assignedTo: "",
      });
      navigate(`/service/tickets/${data.id}`);
    } catch (err) {
      toast.error(err.message || "Create failed");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Service tickets</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={load} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #ddd" }}>Refresh</button>
          <button type="button" onClick={() => setShow(true)} style={{ padding: "8px 14px", borderRadius: 8, background: "#005fb8", color: "#fff", border: "none", fontWeight: 700 }}>New ticket</button>
        </div>
      </div>

      {show && (
        <form onSubmit={create} style={{ background: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 16, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>New service ticket</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            <label>Customer id *<input required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Item id (SKU master) *<input required value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Order id<input value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Dispatch order id<input value={form.dispatchOrderId} onChange={(e) => setForm({ ...form, dispatchOrderId: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Assign technician (user id)<input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label>Type
              <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} style={{ width: "100%", marginTop: 4 }}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: "100%", marginTop: 4 }}>
                {PRI.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>Issue type<input value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })} style={{ width: "100%", marginTop: 4 }} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Description<textarea value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} rows={2} style={{ width: "100%", marginTop: 4 }} /></label>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="submit" style={{ padding: "8px 16px", fontWeight: 700, background: "#15803d", color: "#fff", border: "none", borderRadius: 8 }}>Create</button>
            <button type="button" onClick={() => setShow(false)} style={{ padding: "8px 16px" }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div style={{ color: "#94a3b8" }}>Loading…</div> : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={{ padding: 10 }}>Ticket</th>
              <th style={{ padding: 10 }}>Customer</th>
              <th style={{ padding: 10 }}>Type</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Priority</th>
              <th style={{ padding: 10 }}>Warranty hint</th>
              <th style={{ padding: 10 }} />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: 10, fontWeight: 700 }}>{r.ticketNumber}</td>
                  <td style={{ padding: 10 }}>{r.customerId}</td>
                  <td style={{ padding: 10 }}>{r.serviceType}</td>
                  <td style={{ padding: 10 }}>{r.status}</td>
                  <td style={{ padding: 10 }}>{r.priority}</td>
                  <td style={{ padding: 10 }}>{r.warrantyStatus || "—"}</td>
                  <td style={{ padding: 10 }}><Link to={`/service/tickets/${r.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TicketDetail({ id }) {
  const navigate = useNavigate();
  const [t, setT] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [spare, setSpare] = useState({ itemId: "", warehouseId: "", qty: "", notes: "" });
  const [upd, setUpd] = useState({ visitNotes: "", issueFindings: "", resolutionNotes: "", nextAction: "" });
  const [nextStatus, setNextStatus] = useState("");

  const load = useCallback(() => {
    apiFetch(`/after-sales/tickets/${id}`)
      .then((r) => r.json())
      .then(setT)
      .catch(() => toast.error("Ticket not found"));
    apiFetch("/after-sales/warehouses")
      .then((r) => (r.ok ? r.json() : []))
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!t) return <div style={{ padding: 24 }}>Loading…</div>;

  const patchStatus = async () => {
    if (!nextStatus) return;
    const res = await apiFetch(`/after-sales/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).message || "Update failed");
    else { toast.success("Updated"); load(); }
  };

  const addUpdate = async (e) => {
    e.preventDefault();
    const res = await apiFetch(`/after-sales/tickets/${id}/updates`, {
      method: "POST",
      body: JSON.stringify(upd),
    });
    if (!res.ok) toast.error("Failed to add update");
    else { toast.success("Update saved"); setUpd({ visitNotes: "", issueFindings: "", resolutionNotes: "", nextAction: "" }); load(); }
  };

  const spareUse = async (e) => {
    e.preventDefault();
    const res = await apiFetch(`/after-sales/tickets/${id}/spare-use`, {
      method: "POST",
      body: JSON.stringify({
        itemId: +spare.itemId,
        warehouseId: +spare.warehouseId,
        qty: +spare.qty,
        notes: spare.notes || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(data.message || "Spare issue failed");
    else { toast.success("Spare posted to inventory ledger"); setSpare({ itemId: "", warehouseId: "", qty: "", notes: "" }); load(); }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <button type="button" onClick={() => navigate("/service/tickets")} style={{ marginBottom: 12, padding: "8px 12px" }}>← All tickets</button>
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>{t.ticketNumber}</h1>
      <div style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
        Customer #{t.customerId} · Item #{t.itemId} · {t.serviceType} · {t.status} · {t.warrantyStatus || "—"}
      </div>

      <div style={{ marginBottom: 20, padding: 14, background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", fontSize: 13 }}>
        Warranty / AMC hints are operational estimates from delivery dates and active AMC rows — not legal certification.
      </div>

      <section style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Change status</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} style={{ padding: 8 }}>
            <option value="">Select…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={patchStatus} style={{ padding: "8px 14px", fontWeight: 700 }}>Apply</button>
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Field update</div>
        <form onSubmit={addUpdate} style={{ display: "grid", gap: 8 }}>
          <textarea placeholder="Visit notes" value={upd.visitNotes} onChange={(e) => setUpd({ ...upd, visitNotes: e.target.value })} rows={2} />
          <textarea placeholder="Issue findings" value={upd.issueFindings} onChange={(e) => setUpd({ ...upd, issueFindings: e.target.value })} rows={2} />
          <textarea placeholder="Resolution notes (update)" value={upd.resolutionNotes} onChange={(e) => setUpd({ ...upd, resolutionNotes: e.target.value })} rows={2} />
          <input placeholder="Next action" value={upd.nextAction} onChange={(e) => setUpd({ ...upd, nextAction: e.target.value })} />
          <button type="submit" style={{ padding: "8px 14px", fontWeight: 700 }}>Add update</button>
        </form>
      </section>

      <section style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Spare consumption (inventory OUT)</div>
        <form onSubmit={spareUse} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input required placeholder="Spare item id" value={spare.itemId} onChange={(e) => setSpare({ ...spare, itemId: e.target.value })} />
          <select required value={spare.warehouseId} onChange={(e) => setSpare({ ...spare, warehouseId: e.target.value })}>
            <option value="">Warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </select>
          <input required placeholder="Qty" value={spare.qty} onChange={(e) => setSpare({ ...spare, qty: e.target.value })} />
          <input placeholder="Notes" value={spare.notes} onChange={(e) => setSpare({ ...spare, notes: e.target.value })} />
          <button type="submit" style={{ gridColumn: "1 / -1", padding: "10px", fontWeight: 800, background: "#b91c1c", color: "#fff", border: "none", borderRadius: 8 }}>
            Post SERVICE_SPARE_USE
          </button>
        </form>
      </section>

      <section>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>History</div>
        {(t.updates || []).map((u) => (
          <div key={u.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 }}>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>{new Date(u.createdAt).toLocaleString()}</div>
            {u.visitNotes && <div><strong>Visit:</strong> {u.visitNotes}</div>}
            {u.issueFindings && <div><strong>Findings:</strong> {u.issueFindings}</div>}
            {u.resolutionNotes && <div><strong>Resolution:</strong> {u.resolutionNotes}</div>}
            {u.nextAction && <div><strong>Next:</strong> {u.nextAction}</div>}
          </div>
        ))}
      </section>
    </div>
  );
}

export default function ServiceTicketsPage() {
  const { id } = useParams();
  if (id) return <TicketDetail id={id} />;
  return <TicketList />;
}
