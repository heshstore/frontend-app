import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

const STATUS_META = {
  draft:      { bg: '#f3f4f6', color: '#6b7280',  label: 'Draft'     },
  scheduled:  { bg: '#e0f2fe', color: '#0369a1',  label: 'Scheduled' },
  running:    { bg: '#dcfce7', color: '#166534',  label: 'Running'   },
  paused:     { bg: '#fef9c3', color: '#854d0e',  label: 'Paused'    },
  completed:  { bg: '#f0fdf4', color: '#15803d',  label: 'Completed' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b',  label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { bg: '#f3f4f6', color: '#6b7280', label: status };
  return (
    <span style={{ background: m.bg, color: m.color, padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
      {m.label}
    </span>
  );
}

function PercentBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: '#374151', fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#6b7280' }}>{count} <strong style={{ color }}>{pct}%</strong></span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, minWidth: pct > 0 ? 3 : 0 }} />
      </div>
    </div>
  );
}

function CampaignStatsPanel({ campaignId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/marketing/whatsapp-engine/analytics/campaigns/${campaignId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setStats(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId]);

  if (loading) return <div style={{ fontSize: 12, color: '#6b7280', padding: '8px 0' }}>Loading stats…</div>;
  if (!stats) return <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0' }}>No stats yet</div>;
  const total = stats.total || stats.sent || 1;
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginTop: 10 }}>
      <PercentBar label="Sent"      count={stats.sent      || 0} total={total} color="#1d4ed8" />
      <PercentBar label="Delivered" count={stats.delivered || 0} total={total} color="#0f766e" />
      <PercentBar label="Read"      count={stats.read      || 0} total={total} color="#6d28d9" />
      <PercentBar label="Replied"   count={stats.replied   || 0} total={total} color="#166534" />
      <PercentBar label="Failed"    count={stats.failed    || 0} total={total} color="#991b1b" />
      {(stats.skipped || 0) > 0 && <PercentBar label="Skipped" count={stats.skipped} total={total} color="#6b7280" />}
    </div>
  );
}

function CreateModal({ templates, onClose, onCreated }) {
  const [form, setForm] = useState({
    campaign_name: '', daily_target: 50,
    send_window_start: '09:00', send_window_end: '18:00',
    random_delay_min: 30, random_delay_max: 120,
    template_id: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.campaign_name.trim()) { setErr('Campaign name is required'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await apiFetch('/marketing/whatsapp-engine/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          daily_target: parseInt(form.daily_target, 10) || 50,
          random_delay_min: parseInt(form.random_delay_min, 10) || 30,
          random_delay_max: parseInt(form.random_delay_max, 10) || 120,
          // FIX: template_id is UUID — pass as string, not parseInt
          template_id: form.template_id || null,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Error ${r.status}`); }
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const lbl = (text) => <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{text}</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>New Campaign</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            {lbl('Campaign Name *')}
            <input style={inputStyle} value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} placeholder="e.g. May AC Campaign" />
          </div>
          <div>
            {lbl('Template')}
            <select
              style={inputStyle}
              value={form.template_id}
              onChange={e => set('template_id', e.target.value)}
            >
              <option value="">— No template (use default) —</option>
              {templates.filter(t => t.is_active !== false).map(t => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
              {templates.filter(t => t.is_active === false).length > 0 && (
                <>
                  <option disabled>── Inactive ──</option>
                  {templates.filter(t => t.is_active === false).map(t => (
                    <option key={t.id} value={t.id}>{t.template_name} (inactive)</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {lbl('Daily Target')}
              <input style={inputStyle} type="number" min={1} value={form.daily_target} onChange={e => set('daily_target', e.target.value)} />
            </div>
            <div>
              {lbl('Send Window')}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input style={{ ...inputStyle, width: 'auto' }} type="time" value={form.send_window_start} onChange={e => set('send_window_start', e.target.value)} />
                <span style={{ color: '#9ca3af', fontSize: 12 }}>–</span>
                <input style={{ ...inputStyle, width: 'auto' }} type="time" value={form.send_window_end} onChange={e => set('send_window_end', e.target.value)} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {lbl('Min Delay (sec)')}
              <input style={inputStyle} type="number" min={5} value={form.random_delay_min} onChange={e => set('random_delay_min', e.target.value)} />
            </div>
            <div>
              {lbl('Max Delay (sec)')}
              <input style={inputStyle} type="number" min={5} value={form.random_delay_max} onChange={e => set('random_delay_max', e.target.value)} />
            </div>
          </div>
          <div>
            {lbl('Notes')}
            <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" />
          </div>
        </div>

        {err && <div style={{ marginTop: 12, fontSize: 12, color: '#dc3545', background: '#fff5f5', borderRadius: 6, padding: '8px 12px' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#0d6efd', '#fff', busy)} disabled={busy} onClick={submit}>
            {busy ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pre-flight checklist modal ────────────────────────────────────────────────

const PREFLIGHT_ITEMS = [
  { id: 'audience',  label: 'Audience is segmented correctly — no test contacts mixed in with live audience' },
  { id: 'template',  label: 'Template has been reviewed — message is correct, no placeholder text' },
  { id: 'window',    label: 'Send window is set (09:00–18:00 or similar) — not sending late night' },
  { id: 'volume',    label: 'Expected send volume is within daily limit of the number(s) in use' },
  { id: 'numbers',   label: 'WA number(s) are connected and showing CONNECTED status in Numbers page' },
  { id: 'governance', label: 'Engine governance check passed — stability report shows no active issues' },
];

function PreflightModal({ campaign, templateName, onConfirm, onClose, busy }) {
  const [checked, setChecked] = useState({});
  const allPassed = PREFLIGHT_ITEMS.every(i => checked[i.id]);
  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 520, width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>Pre-flight Checklist</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Launching <strong>{campaign.campaign_name}</strong>
          {templateName && <> · template <strong>{templateName}</strong></>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {PREFLIGHT_ITEMS.map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 6, background: checked[item.id] ? '#f0fdf4' : '#fafafa', border: `1px solid ${checked[item.id] ? '#bbf7d0' : '#e5e7eb'}` }}>
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                onChange={() => toggle(item.id)}
                style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: checked[item.id] ? '#166534' : '#374151', lineHeight: 1.4 }}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
          {PREFLIGHT_ITEMS.filter(i => checked[i.id]).length} / {PREFLIGHT_ITEMS.length} items confirmed
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{ padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => allPassed && !busy && onConfirm()}
            disabled={!allPassed || busy}
            style={{
              padding: '10px 18px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700,
              cursor: allPassed && !busy ? 'pointer' : 'not-allowed',
              background: allPassed ? '#198754' : '#e5e7eb',
              color: allPassed ? '#fff' : '#9ca3af',
            }}
          >
            {busy ? 'Launching…' : allPassed ? '✓ Launch Campaign' : `Confirm all ${PREFLIGHT_ITEMS.length} items first`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [preflightCampaign, setPreflightCampaign] = useState(null); // campaign pending launch

  const flash = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cr, tr] = await Promise.all([
        apiFetch('/marketing/whatsapp-engine/campaigns'),
        apiFetch('/marketing/whatsapp-engine/templates'),
      ]);
      if (!cr.ok) throw new Error(`Server error ${cr.status}`);
      const [cd, td] = await Promise.all([cr.json(), tr.ok ? tr.json() : []]);
      setCampaigns(Array.isArray(cd) ? cd : (cd.campaigns ?? []));
      setTemplates(Array.isArray(td) ? td : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (id, action) => {
    setBusyId(id);
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/campaigns/${id}/${action}`, { method: 'POST' });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Error ${r.status}`); }
      const d = await r.json().catch(() => ({}));
      const queued = d.queued;
      flash(`Campaign ${action}ed${queued != null ? ` · ${queued} items queued` : ''}`);
      await load();
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusyId(null);
    }
  };

  // Map template UUID → name for display
  const templateMap = Object.fromEntries(templates.map(t => [t.id, t.template_name]));

  const actionButtons = (c) => {
    const busy = busyId === c.id;
    switch (c.status) {
      case 'draft':
      case 'scheduled':
        return (
          <button style={btn('#198754', '#fff', busy || !c.template_id)} disabled={busy || !c.template_id} onClick={() => setPreflightCampaign(c)} title={!c.template_id ? 'Set a template first' : 'Launch campaign'}>
            Launch
          </button>
        );
      case 'running':
        return (
          <>
            <button style={btn('#fef9c3', '#854d0e', busy)} disabled={busy} onClick={() => doAction(c.id, 'pause')}>Pause</button>
            <button style={btn('#eff6ff', '#1d4ed8')} onClick={() => navigate(`/marketing/whatsapp-engine/queue?campaign=${c.id}`)} title="View queue for this campaign">Queue</button>
          </>
        );
      case 'paused':
        return (
          <>
            <button style={btn('#198754', '#fff', busy)} disabled={busy} onClick={() => doAction(c.id, 'resume')}>Resume</button>
            <button style={btn('#fee2e2', '#991b1b', busy)} disabled={busy} onClick={() => doAction(c.id, 'cancel')}>Cancel</button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Campaigns"
      subtitle="Create and manage WhatsApp marketing campaigns"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {feedback && <span style={{ fontSize: 12, color: feedback.isError ? '#dc3545' : '#198754', fontWeight: 600 }}>{feedback.msg}</span>}
          <button style={btn('#0d6efd')} onClick={() => setShowCreate(true)}>+ New Campaign</button>
          <button style={btn('#6b7280', '#fff', loading)} onClick={load} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
        </div>
      }
    >
      {showCreate && (
        <CreateModal
          templates={templates}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); flash('Campaign created'); }}
        />
      )}

      {preflightCampaign && (
        <PreflightModal
          campaign={preflightCampaign}
          templateName={templateMap[preflightCampaign.template_id]}
          onConfirm={() => { doAction(preflightCampaign.id, 'launch'); setPreflightCampaign(null); }}
          onClose={() => setPreflightCampaign(null)}
          busy={busyId === preflightCampaign.id}
        />
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Workflow hint */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#475569', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Workflow:</span>
          <button onClick={() => navigate('/marketing/whatsapp-engine/audience')} style={{ ...btn('#f0f9ff', '#0369a1'), padding: '3px 10px', fontSize: 11 }}>Audience</button>
          <span style={{ color: '#94a3b8' }}>→</span>
          <button onClick={() => navigate('/marketing/whatsapp-engine/templates')} style={{ ...btn('#f0f9ff', '#0369a1'), padding: '3px 10px', fontSize: 11 }}>Templates</button>
          <span style={{ color: '#94a3b8' }}>→</span>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Campaigns</span>
          <span style={{ color: '#94a3b8' }}>→</span>
          <button onClick={() => navigate('/marketing/whatsapp-engine/queue')} style={{ ...btn('#f0f9ff', '#0369a1'), padding: '3px 10px', fontSize: 11 }}>Queue</button>
          <span style={{ color: '#94a3b8' }}>→</span>
          <button onClick={() => navigate('/marketing/whatsapp-engine/inbox')} style={{ ...btn('#f0f9ff', '#0369a1'), padding: '3px 10px', fontSize: 11 }}>Inbox</button>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 16, color: '#dc3545' }}>
            {error} <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={load}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📢</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>No campaigns yet</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Create a campaign after adding audience contacts and at least one template.</div>
            <button style={btn('#0d6efd')} onClick={() => setShowCreate(true)}>+ New Campaign</button>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Campaign</th>
                  <th style={th}>Status</th>
                  <th style={th}>Template</th>
                  <th style={th}>Daily Target</th>
                  <th style={th}>Send Window</th>
                  <th style={th}>Notes</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <React.Fragment key={c.id}>
                    <tr style={{ background: expandedId === c.id ? '#f8fafc' : '#fff' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{c.campaign_name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td style={td}><StatusBadge status={c.status} /></td>
                      <td style={td}>
                        {c.template_id
                          ? <span style={{ fontSize: 12, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>
                              {templateMap[c.template_id] || `Template ${c.template_id.slice(0, 8)}…`}
                            </span>
                          : <span style={{ color: '#9ca3af', fontSize: 12 }}>No template set</span>}
                      </td>
                      <td style={td}><span style={{ fontWeight: 700, color: '#0d6efd' }}>{c.daily_target ?? '—'}</span></td>
                      <td style={{ ...td, fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                        {c.send_window_start && c.send_window_end ? `${c.send_window_start} – ${c.send_window_end}` : '—'}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.notes || '—'}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {actionButtons(c)}
                          <button
                            style={btn(expandedId === c.id ? '#eff6ff' : '#f3f4f6', expandedId === c.id ? '#1d4ed8' : '#374151')}
                            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                          >
                            {expandedId === c.id ? '▲ Stats' : '▼ Stats'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: '0 14px 14px', background: '#f8fafc' }}>
                          <CampaignStatsPanel campaignId={c.id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}. Campaign must have a template set before launching.
        </div>
      </div>
    </PageLayout>
  );
}
