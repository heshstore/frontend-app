import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import {
  FormSection, FormCard, FormGrid, FormField, FormActions,
  inputStyle, selectStyle,
} from "./components/ui/FormComponents";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";

const GST_OPTIONS  = [{ value: '', label: 'Select GST %' }, { value: '0', label: '0%' }, { value: '5', label: '5%' }, { value: '12', label: '12%' }, { value: '18', label: '18%' }, { value: '28', label: '28%' }];
const UNIT_OPTIONS = ['pcs', 'box', 'doz', 'pair', 'set', 'kg', 'ltr'];

export default function AddItem() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    sku:          '',
    itemName:     '',
    hsnCode:      '',
    gst:          '',
    costPrice:    '',
    sellingPrice: '',
    unit:         'pcs',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

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

  const rupeeInput = (name) => ({
    ...inputStyle,
    paddingLeft: 28,
  });

  const RupeeField = ({ name, label, required, help }) => (
    <FormField label={label} required={required} help={help}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13, pointerEvents: 'none' }}>₹</span>
        <input name={name} type="number" min="0" step="0.01" value={form[name]} onChange={handleChange} style={rupeeInput(name)} />
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
            </FormGrid>
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
