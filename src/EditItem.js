import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import {
  FormSection, FormCard, FormGrid, FormField, FormActions,
  inputStyle, selectStyle,
} from "./components/ui/FormComponents";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";
import { hasAnyPermission } from "./utils/usePermission";
import BoqManager from "./pages/boq/BoqManager";

const GST_OPTIONS  = [{ value: '', label: 'Select GST %' }, { value: '5', label: '5%' }, { value: '18', label: '18%' }];
const UNIT_OPTIONS = ['pcs', 'box', 'doz', 'pair', 'set', 'kg', 'ltr'];

const CATEGORY_OPTIONS = [
  { value: 'TRADING',       label: 'Trading' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'SERVICE',       label: 'Service' },
];

const SERVICE_SUBTYPE_OPTIONS = [
  { value: '',           label: '— None —' },
  { value: 'AMC',        label: 'AMC' },
  { value: 'REPAIR',     label: 'Repair' },
  { value: 'COMPLAINT',  label: 'Complaint' },
  { value: 'SPARE_PART', label: 'Spare part' },
];

const BOQ_STATUS_OPTIONS = [
  { value: 'NOT_CREATED', label: 'Not created' },
  { value: 'PARTIAL',     label: 'Partial' },
  { value: 'COMPLETE',    label: 'Complete' },
];

const STOCK_TRACKING_OPTIONS = ['PCS', 'SQFT', 'KG', 'METER', 'SHEET'];

function VendorMappingsSection({ itemId }) {
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    vendorId: "", vendorSku: "", purchaseRate: "", minimumOrderQty: "0",
    leadTimeDays: "0", preferredVendor: false, remarks: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/vendor-item-mappings?itemId=${itemId}&itemSource=SERVICE`),
      apiFetch("/vendors?active=true"),
    ])
      .then(async ([m, v]) => {
        if (m.ok) setRows(await m.json());
        if (v.ok) setVendors(await v.json());
      })
      .catch(() => toast.error("Failed to load vendor mappings"))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const addRow = async (e) => {
    e.preventDefault();
    if (!form.vendorId || !form.purchaseRate) {
      toast.error("Vendor and purchase rate required");
      return;
    }
    const res = await apiFetch("/vendor-item-mappings", {
      method: "POST",
      body: JSON.stringify({
        vendorId: +form.vendorId,
        itemId: +itemId,
        itemSource: "SERVICE",
        vendorSku: form.vendorSku || null,
        purchaseRate: +form.purchaseRate,
        minimumOrderQty: +form.minimumOrderQty || 0,
        leadTimeDays: +form.leadTimeDays || 0,
        preferredVendor: form.preferredVendor,
        remarks: form.remarks || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Failed to add mapping");
      return;
    }
    toast.success("Vendor mapping added");
    setForm({
      vendorId: "", vendorSku: "", purchaseRate: "", minimumOrderQty: "0",
      leadTimeDays: "0", preferredVendor: false, remarks: "",
    });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this vendor mapping?")) return;
    const res = await apiFetch(`/vendor-item-mappings/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Remove failed"); return; }
    toast.success("Removed");
    load();
  };

  if (!hasAnyPermission("inventory.view")) return null;

  return (
    <div style={{ marginTop: 28, maxWidth: 720 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>Vendor price list</h2>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        Link suppliers and purchase rates for procurement. Used when creating POs from purchase requirements.
      </p>
      {loading ? <div style={{ color: "#94a3b8" }}>Loading…</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Vendor</th>
              <th style={{ padding: 8 }}>Vendor SKU</th>
              <th style={{ padding: 8, textAlign: "right" }}>Rate</th>
              <th style={{ padding: 8, textAlign: "right" }}>MOQ</th>
              <th style={{ padding: 8, textAlign: "right" }}>Lead (d)</th>
              <th style={{ padding: 8 }}>Pref</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 8 }}>
                  {row.vendor?.vendorName ?? row.vendor?.vendor_name ?? row.vendorId}
                </td>
                <td style={{ padding: 8, color: "#64748b" }}>{row.vendorSku ?? row.vendor_sku ?? "—"}</td>
                <td style={{ padding: 8, textAlign: "right" }}>₹{Number(row.purchaseRate ?? row.purchase_rate).toLocaleString("en-IN")}</td>
                <td style={{ padding: 8, textAlign: "right" }}>{row.minimumOrderQty ?? row.minimum_order_qty}</td>
                <td style={{ padding: 8, textAlign: "right" }}>{row.leadTimeDays ?? row.lead_time_days}</td>
                <td style={{ padding: 8 }}>{(row.preferredVendor ?? row.preferred_vendor) ? "Yes" : ""}</td>
                <td style={{ padding: 8 }}>
                  {hasAnyPermission("inventory.manage") && (
                    <button type="button" onClick={() => remove(row.id)} style={{ fontSize: 12, color: "#b91c1c", border: "none", background: "none", cursor: "pointer" }}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {hasAnyPermission("inventory.manage") && (
        <form onSubmit={addRow} style={{ display: "grid", gap: 8, padding: 14, background: "#fafafa", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Add mapping</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <select
              style={selectStyle}
              value={form.vendorId}
              onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
            >
              <option value="">Vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {(v.vendorCode ?? v.vendor_code)} — {(v.vendorName ?? v.vendor_name)}
                </option>
              ))}
            </select>
            <input style={inputStyle} placeholder="Vendor SKU" value={form.vendorSku} onChange={(e) => setForm((f) => ({ ...f, vendorSku: e.target.value }))} />
            <input style={inputStyle} placeholder="Purchase rate ₹" type="number" value={form.purchaseRate} onChange={(e) => setForm((f) => ({ ...f, purchaseRate: e.target.value }))} />
            <input style={{ ...inputStyle, width: 72 }} placeholder="MOQ" type="number" value={form.minimumOrderQty} onChange={(e) => setForm((f) => ({ ...f, minimumOrderQty: e.target.value }))} />
            <input style={{ ...inputStyle, width: 72 }} placeholder="Lead" type="number" value={form.leadTimeDays} onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))} />
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={form.preferredVendor} onChange={(e) => setForm((f) => ({ ...f, preferredVendor: e.target.checked }))} />
              Preferred
            </label>
            <button type="submit" style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#005fb8", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Add</button>
          </div>
        </form>
      )}
    </div>
  );
}

const CATEGORY_DEFAULTS = {
  TRADING:       { requiresProduction: false, requiresPurchase: true  },
  MANUFACTURING: { requiresProduction: true,  requiresPurchase: true  },
  SERVICE:       { requiresProduction: false, requiresPurchase: false },
};

const checkboxStyle = {
  width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer',
};

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    apiFetch(`/service-items/${id}`)
      .then(r => r.json())
      .then(item => {
        setForm({
          sku:               item.sku           ?? '',
          itemName:          item.itemName       ?? '',
          hsnCode:           item.hsnCode        ?? '',
          gst:               String(item.gst     ?? ''),
          costPrice:         String(item.costPrice    ?? ''),
          sellingPrice:      String(item.sellingPrice ?? ''),
          unit:              item.unit              ?? 'pcs',
          mainCategoryType:  item.mainCategoryType   ?? 'TRADING',
          serviceSubtype:    item.serviceSubtype      ?? '',
          boqStatus:         item.boqStatus           ?? 'NOT_CREATED',
          stockTrackingType: item.stockTrackingType   ?? 'PCS',
          isRawMaterial:     Boolean(item.isRawMaterial),
          requiresProduction: Boolean(item.requiresProduction),
          requiresPurchase:   item.requiresPurchase !== false,
        });
      })
      .catch(() => toast.error('Failed to load item'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    const defaults = CATEGORY_DEFAULTS[cat] ?? CATEGORY_DEFAULTS['TRADING'];
    setForm(prev => ({
      ...prev,
      mainCategoryType:   cat,
      serviceSubtype:     cat !== 'SERVICE' ? '' : prev.serviceSubtype,
      requiresProduction: defaults.requiresProduction,
      requiresPurchase:   defaults.requiresPurchase,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemName)     { toast.error('Item name is required');     return; }
    if (!form.sellingPrice) { toast.error('Selling price is required'); return; }

    setSaving(true);
    try {
      const res = await apiFetch(`/service-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          gst:          Number(form.gst         || 0),
          costPrice:    Number(form.costPrice    || 0),
          sellingPrice: Number(form.sellingPrice || 0),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Item updated');
      navigate('/items');
    } catch {
      toast.error('Error saving item');
    } finally {
      setSaving(false);
    }
  };

  const rupeeInput = () => ({ ...inputStyle, paddingLeft: 28 });

  const RupeeField = ({ name, label, required, help }) => (
    <FormField label={label} required={required} help={help}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13, pointerEvents: 'none' }}>₹</span>
        <input name={name} type="number" min="0" step="0.01" value={form[name]} onChange={handleChange} style={rupeeInput()} />
      </div>
    </FormField>
  );

  if (loading) return <PageLayout title="Edit item"><div style={{ padding: 32, color: '#6b7280' }}>Loading…</div></PageLayout>;
  if (!form)   return <PageLayout title="Edit item"><div style={{ padding: 32, color: '#dc2626' }}>Item not found.</div></PageLayout>;

  return (
    <PageLayout title="Edit item">
      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>

        {/* ── Identification ─────────────────────────────────── */}
        <FormSection title="Identification">
          <FormCard>
            <FormGrid cols={2} minColWidth={180}>
              <FormField label="SKU" help="Unique product code">
                <input name="sku" value={form.sku} onChange={handleChange} placeholder="e.g. SP-1.00-CYL" style={inputStyle} />
              </FormField>
              <FormField label="Item name" required colSpan={2}>
                <input name="itemName" value={form.itemName} onChange={handleChange} placeholder="Full product name" style={inputStyle} />
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {/* ── Classification ─────────────────────────────────── */}
        <FormSection title="Classification">
          <FormCard>
            <FormGrid cols={2} minColWidth={180}>
              <FormField label="Main category type">
                <select name="mainCategoryType" value={form.mainCategoryType} onChange={handleCategoryChange} style={selectStyle}>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>

              {form.mainCategoryType === 'SERVICE' && (
                <FormField label="Service subtype">
                  <select name="serviceSubtype" value={form.serviceSubtype} onChange={handleChange} style={selectStyle}>
                    {SERVICE_SUBTYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>
              )}

              <FormField label="HSN code" help="Up to 8 digits">
                <input
                  name="hsnCode"
                  value={form.hsnCode}
                  onChange={(e) => setForm(prev => ({ ...prev, hsnCode: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder="e.g. 90013000"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="GST rate">
                <select name="gst" value={form.gst} onChange={handleChange} style={selectStyle}>
                  {GST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <FormField label="Unit">
                <select name="unit" value={form.unit} onChange={handleChange} style={selectStyle}>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormField>
              <FormField label="Stock tracking type">
                <select name="stockTrackingType" value={form.stockTrackingType} onChange={handleChange} style={selectStyle}>
                  {STOCK_TRACKING_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="BOQ status">
                <select name="boqStatus" value={form.boqStatus} onChange={handleChange} style={selectStyle}>
                  {BOQ_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </FormGrid>

            {/* Boolean flags row */}
            <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" name="requiresProduction" checked={form.requiresProduction} onChange={handleChange} style={checkboxStyle} />
                Requires production
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" name="requiresPurchase" checked={form.requiresPurchase} onChange={handleChange} style={checkboxStyle} />
                Requires purchase
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" name="isRawMaterial" checked={form.isRawMaterial} onChange={handleChange} style={checkboxStyle} />
                Raw material
              </label>
            </div>
          </FormCard>
        </FormSection>

        {/* ── Pricing ────────────────────────────────────────── */}
        <FormSection title="Pricing">
          <FormCard>
            <FormGrid cols={2} minColWidth={180}>
              <RupeeField name="costPrice"    label="Cost price"    help="Your purchase price" />
              <RupeeField name="sellingPrice" label="Selling price" required help="Retail / default price" />
            </FormGrid>
          </FormCard>
        </FormSection>

        <FormActions saveLabel="Save changes" loading={saving} onCancel={() => navigate('/items')} />
      </form>

      {id && <VendorMappingsSection itemId={Number(id)} />}

      {form.mainCategoryType === 'MANUFACTURING' && id && (
        <div style={{ marginTop: 32, maxWidth: 960 }}>
          <BoqManager itemId={Number(id)} itemName={form.itemName} />
        </div>
      )}
    </PageLayout>
  );
}
