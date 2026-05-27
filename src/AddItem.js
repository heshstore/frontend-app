import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import {
  FormSection, FormCard, FormGrid, FormField, FormActions,
  inputStyle, selectStyle,
} from "./components/ui/FormComponents";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";
import { GST_OPTIONS } from "./config/gstOptions";
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

const CATEGORY_DEFAULTS = {
  TRADING:       { requiresProduction: false, requiresPurchase: true  },
  MANUFACTURING: { requiresProduction: true,  requiresPurchase: true  },
  SERVICE:       { requiresProduction: false, requiresPurchase: false },
};

const checkboxStyle = {
  width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer',
};

export default function AddItem() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    sku:               '',
    itemName:          '',
    hsnCode:           '',
    gst:               '',
    costPrice:         '',
    sellingPrice:      '',
    unit:              'pcs',
    mainCategoryType:  'TRADING',
    serviceSubtype:    '',
    boqStatus:         'NOT_CREATED',
    stockTrackingType: 'PCS',
    isRawMaterial:     false,
    requiresProduction: false,
    requiresPurchase:   true,
  });
  const [loading, setLoading] = useState(false);

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
    if (!form.sku)          { toast.error('SKU is required');           return; }
    if (!form.itemName)     { toast.error('Item name is required');     return; }
    if (!form.sellingPrice) { toast.error('Selling price is required'); return; }

    setLoading(true);
    try {
      const res = await apiFetch('/service-items', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          gst:          Number(form.gst         || 0),
          costPrice:    Number(form.costPrice    || 0),
          sellingPrice: Number(form.sellingPrice || 0),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Item added');
      navigate('/items');
    } catch {
      toast.error('Error saving item');
    } finally {
      setLoading(false);
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

  return (
    <PageLayout title="Add item">
      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>

        {/* ── Identification ─────────────────────────────────── */}
        <FormSection title="Identification">
          <FormCard>
            <FormGrid cols={2} minColWidth={180}>
              <FormField label="SKU" required help="Unique product code">
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

        <FormActions saveLabel="Save item" loading={loading} />
      </form>
    </PageLayout>
  );
}
