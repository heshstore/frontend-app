import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6,
  padding: '6px 13px', fontSize: 12, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap', transition: 'opacity .15s',
});

const th = {
  padding: '10px 14px', background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left', fontWeight: 600,
  color: '#475569', fontSize: 12, whiteSpace: 'nowrap',
};

const td = {
  padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
  fontSize: 13, verticalAlign: 'middle',
};

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 13, boxSizing: 'border-box',
};

const BLANK = {
  template_name: '', message_body: '',
  message_type: 'text', cta_type: 'none',
  product_category: '', performance_weight: 1,
};

function TemplateModal({ template, onClose, onSaved }) {
  const isEdit = Boolean(template);
  const [form, setForm] = useState(isEdit ? {
    template_name:     template.template_name     ?? '',
    message_body:      template.message_body      ?? '',
    message_type:      template.message_type      ?? 'text',
    cta_type:          template.cta_type          ?? 'none',
    product_category:  template.product_category  ?? '',
    performance_weight: template.performance_weight ?? 1,
  } : BLANK);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.template_name.trim()) { setErr('Template name is required'); return; }
    if (!form.message_body.trim()) { setErr('Message body is required'); return; }
    setBusy(true); setErr(null);
    try {
      const url = isEdit
        ? `/marketing/whatsapp-engine/templates/${template.id}`
        : '/marketing/whatsapp-engine/templates';
      const r = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, performance_weight: parseFloat(form.performance_weight) || 1 }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Error ${r.status}`); }
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const label = (text) => <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{text}</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{isEdit ? 'Edit Template' : 'New Template'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            {label('Template Name *')}
            <input style={inputStyle} value={form.template_name} onChange={e => set('template_name', e.target.value)} placeholder="e.g. AC Summer Offer" />
          </div>
          <div>
            {label('Message Body *')}
            <textarea
              style={{ ...inputStyle, height: 140, resize: 'vertical' }}
              value={form.message_body}
              onChange={e => set('message_body', e.target.value)}
              placeholder="Hello {name}, we have a special offer…"
            />
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              Use {'{name}'}, {'{city}'} as placeholders
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {label('Message Type')}
              <select style={inputStyle} value={form.message_type} onChange={e => set('message_type', e.target.value)}>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div>
              {label('CTA Type')}
              <select style={inputStyle} value={form.cta_type} onChange={e => set('cta_type', e.target.value)}>
                <option value="none">None</option>
                <option value="call">Call</option>
                <option value="url">URL</option>
                <option value="reply">Quick Reply</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {label('Product Category')}
              <input style={inputStyle} value={form.product_category} onChange={e => set('product_category', e.target.value)} placeholder="e.g. AC, Fridge" />
            </div>
            <div>
              {label('Performance Weight')}
              <input style={inputStyle} type="number" min={0.1} step={0.1} value={form.performance_weight} onChange={e => set('performance_weight', e.target.value)} />
            </div>
          </div>
        </div>

        {err && <div style={{ marginTop: 12, fontSize: 12, color: '#dc3545', background: '#fff5f5', borderRadius: 6, padding: '8px 12px' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#0d6efd', '#fff', busy)} disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | template object
  const [busyId, setBusyId] = useState(null);

  const flash = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch('/marketing/whatsapp-engine/templates');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json();
      setTemplates(Array.isArray(d) ? d : (d.templates ?? []));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (t) => {
    setBusyId(t.id);
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      flash(t.is_active ? 'Template deactivated' : 'Template activated');
      await load();
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusyId(null);
    }
  };

  const TYPE_ICONS = { text: '💬', image: '🖼️', video: '🎬', document: '📄' };

  return (
    <PageLayout
      title="Message Templates"
      subtitle="Manage WhatsApp message templates for campaigns"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {feedback && <span style={{ fontSize: 12, color: feedback.isError ? '#dc3545' : '#198754', fontWeight: 600 }}>{feedback.msg}</span>}
          <button style={btn('#0d6efd')} onClick={() => setModal('create')}>+ New Template</button>
          <button style={btn('#6b7280', '#fff', loading)} onClick={load} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
        </div>
      }
    >
      {modal && (
        <TemplateModal
          template={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); flash(modal === 'create' ? 'Template created' : 'Template saved'); }}
        />
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 16, color: '#dc3545' }}>
            {error} <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={load}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading templates…</div>
        ) : templates.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>No templates yet</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Create a template to use in campaigns.</div>
            <button style={btn('#0d6efd')} onClick={() => setModal('create')}>+ New Template</button>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Template</th>
                  <th style={th}>Type</th>
                  <th style={th}>Category</th>
                  <th style={th}>CTA</th>
                  <th style={th}>Weight</th>
                  <th style={th}>Status</th>
                  <th style={th}>Preview</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{t.template_name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>ID {t.id}</div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 14 }}>{TYPE_ICONS[t.message_type] ?? '💬'}</span>{' '}
                      <span style={{ fontSize: 12, color: '#475569' }}>{t.message_type}</span>
                    </td>
                    <td style={td}>{t.product_category || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td style={td}>{t.cta_type && t.cta_type !== 'none' ? t.cta_type : <span style={{ color: '#9ca3af' }}>none</span>}</td>
                    <td style={td}>
                      <span style={{ fontWeight: 700, color: '#0d6efd' }}>{Number(t.performance_weight ?? 1).toFixed(1)}</span>
                    </td>
                    <td style={td}>
                      <span style={{
                        background: t.is_active ? '#dcfce7' : '#f3f4f6',
                        color: t.is_active ? '#166534' : '#6b7280',
                        padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      }}>
                        {t.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      <div style={{ fontSize: 12, color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.message_body}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={btn('#f3f4f6', '#374151')} onClick={() => setModal(t)}>Edit</button>
                        <button
                          style={btn(t.is_active ? '#fef9c3' : '#dcfce7', t.is_active ? '#854d0e' : '#166534', busyId === t.id)}
                          disabled={busyId === t.id}
                          onClick={() => toggleActive(t)}
                        >
                          {t.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
