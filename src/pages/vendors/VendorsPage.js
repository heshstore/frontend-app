import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const card = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
  padding: "20px 24px", marginBottom: 20,
};
const inputStyle = {
  padding: "8px 10px", border: "1px solid #d1d5db",
  borderRadius: 6, fontSize: 13, boxSizing: "border-box",
};
const selectStyle = { ...inputStyle };
const btn = (bg, color = "#fff") => ({
  background: bg, color, border: "none", borderRadius: 7,
  padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
});

export default function VendorsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState("true");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
      if (activeOnly) params.set("active", activeOnly);
      const r = await apiFetch(`/vendors?${params}`);
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, activeOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Vendors</h1>
      <p style={{ margin: "4px 0 16px", color: "#64748b", fontSize: 13 }}>
        Supplier master — used for purchase orders and item price lists.
      </p>

      <div style={{ ...card, padding: "14px 20px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search name, code, phone, GST…"
          style={{ ...inputStyle, minWidth: 220 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={selectStyle} value={activeOnly} onChange={(e) => setActiveOnly(e.target.value)}>
          <option value="">All</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <button style={btn("#005fb8")} onClick={() => setAppliedSearch(search)}>Search</button>
        <button style={{ ...btn("#0f172a"), marginLeft: "auto" }} onClick={() => setCreating(true)}>+ Add vendor</button>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Code</th>
                <th style={{ padding: 10 }}>Name</th>
                <th style={{ padding: 10 }}>Phone</th>
                <th style={{ padding: 10 }}>City</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 10, fontWeight: 700 }}>{v.vendorCode}</td>
                  <td style={{ padding: 10 }}>{v.vendorName}</td>
                  <td style={{ padding: 10, color: "#64748b" }}>{v.phone || "—"}</td>
                  <td style={{ padding: 10, color: "#64748b" }}>{v.city || "—"}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 99,
                      background: v.active ? "#dcfce7" : "#f1f5f9",
                      color: v.active ? "#15803d" : "#64748b",
                    }}>
                      {v.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>
                    <button style={btn("#e2e8f0", "#374151")} onClick={() => setEditing(v)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <VendorFormModal
          vendor={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function VendorFormModal({ vendor, onClose, onSaved }) {
  const isEdit = !!vendor;
  const [saving, setSaving] = useState(false);
  const [finance, setFinance] = useState(null);
  const [f, setF] = useState({
    vendorCode: vendor?.vendorCode ?? "",
    vendorName: vendor?.vendorName ?? "",
    contactPerson: vendor?.contactPerson ?? "",
    phone: vendor?.phone ?? "",
    email: vendor?.email ?? "",
    gstNumber: vendor?.gstNumber ?? "",
    address: vendor?.address ?? "",
    city: vendor?.city ?? "",
    state: vendor?.state ?? "",
    pincode: vendor?.pincode ?? "",
    paymentTerms: vendor?.paymentTerms ?? "",
    remarks: vendor?.remarks ?? "",
    active: vendor?.active !== false,
  });

  const ch = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!isEdit || !vendor?.id) {
      setFinance(null);
      return;
    }
    apiFetch(`/finance-ops/vendors/${vendor.id}/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setFinance)
      .catch(() => setFinance(null));
  }, [isEdit, vendor?.id]);

  const save = async () => {
    if (!f.vendorName.trim()) { toast.error("Vendor name required"); return; }
    if (!isEdit && !f.vendorCode.trim()) { toast.error("Vendor code required"); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/vendors/${vendor.id}` : "/vendors";
      const method = isEdit ? "PATCH" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(f) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }
      toast.success(isEdit ? "Vendor updated" : "Vendor created");
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 24, width: 480, maxWidth: "94vw",
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: 17 }}>{isEdit ? "Edit vendor" : "New vendor"}</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <Field label="Vendor code *" value={f.vendorCode} onChange={(v) => ch("vendorCode", v)} disabled={isEdit} />
          <Field label="Vendor name *" value={f.vendorName} onChange={(v) => ch("vendorName", v)} />
          <Field label="Contact person" value={f.contactPerson} onChange={(v) => ch("contactPerson", v)} />
          <Field label="Phone" value={f.phone} onChange={(v) => ch("phone", v)} />
          <Field label="Email" value={f.email} onChange={(v) => ch("email", v)} />
          <Field label="GST number" value={f.gstNumber} onChange={(v) => ch("gstNumber", v)} />
          <Field label="Address" value={f.address} onChange={(v) => ch("address", v)} multiline />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Field label="City" value={f.city} onChange={(v) => ch("city", v)} />
            <Field label="State" value={f.state} onChange={(v) => ch("state", v)} />
            <Field label="Pincode" value={f.pincode} onChange={(v) => ch("pincode", v)} />
          </div>
          <Field label="Payment terms" value={f.paymentTerms} onChange={(v) => ch("paymentTerms", v)} />
          <Field label="Remarks" value={f.remarks} onChange={(v) => ch("remarks", v)} multiline />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={f.active} onChange={(e) => ch("active", e.target.checked)} />
            Active
          </label>
        </div>

        {isEdit && finance && (
          <div style={{ marginTop: 16, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>Finance (operational)</div>
            <div style={{ marginBottom: 6 }}>
              Overdue payable exposure: ₹{Number(finance.overdueAmount || 0).toLocaleString("en-IN")}
            </div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Payables</div>
            <div style={{ maxHeight: 80, overflow: "auto" }}>
              {(finance.payables || []).slice(0, 6).map((p) => (
                <div key={p.id}>
                  PO #{p.purchase_order_id} {p.po_number} · {p.status} · out ₹
                  {Number(p.outstanding_amount || 0).toLocaleString("en-IN")}
                </div>
              ))}
              {!(finance.payables || []).length && <span style={{ color: "#94a3b8" }}>None</span>}
            </div>
            <div style={{ fontWeight: 700, margin: "8px 0 4px" }}>Recent vendor payments</div>
            <div style={{ maxHeight: 72, overflow: "auto" }}>
              {(finance.payments || []).slice(0, 5).map((p) => (
                <div key={p.id}>
                  {p.payment_date} · ₹{Number(p.amount || 0).toLocaleString("en-IN")} · {p.payment_mode}
                </div>
              ))}
              {!(finance.payments || []).length && <span style={{ color: "#94a3b8" }}>None</span>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button style={btn("#e2e8f0", "#374151")} onClick={onClose}>Cancel</button>
          <button style={btn("#005fb8")} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, multiline }) {
  const El = multiline ? "textarea" : "input";
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>{label}</span>
      <El
        disabled={disabled}
        style={{ ...inputStyle, width: "100%", minHeight: multiline ? 56 : undefined }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
