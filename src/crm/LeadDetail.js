import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import ConvertToCustomerModal from './ConvertToCustomerModal';

const STATUSES = ['NEW','CONTACTED','INTERESTED','QUOTATION','CONVERTED','LOST'];
const STATUS_COLORS = {
  NEW: '#ffc107', CONTACTED: '#0d6efd', INTERESTED: '#198754',
  QUOTATION: '#6f42c1', CONVERTED: '#198754', LOST: '#dc3545',
};
const NOTE_TYPES = ['GENERAL','CALL','EMAIL','WHATSAPP'];
const SOURCE_LABELS = {
  INDIAMART:'IndiaMart', META_ADS:'Meta Ads', GOOGLE_ADS:'Google Ads',
  SHOPIFY:'Shopify', WHATSAPP:'WhatsApp', DIRECT_CALL:'Direct Call', MANUAL:'Manual',
};

function canConvert(user) {
  try {
    const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
    return perms.includes('lead.convert');
  } catch { return false; }
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('notes');
  const [newNote, setNewNote] = useState({ note: '', type: 'GENERAL' });
  const [newFu, setNewFu] = useState({ due_date: '', note: '' });
  const [editStatus, setEditStatus] = useState('');
  const [showConvert, setShowConvert] = useState(false);
  const [convertData, setConvertData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/crm/leads/${id}`);
      if (!res.ok) { navigate('/crm/leads'); return; }
      const data = await res.json();
      setLead(data);
      setNotes(data.notes || []);
      setFollowups(data.followups || []);
      setEditStatus(data.status);

      if (data.whatsapp_chat_id) {
        const cr = await apiFetch(`/whatsapp/chat/${encodeURIComponent(data.whatsapp_chat_id)}/messages?leadId=${id}`);
        if (cr.ok) setChatMessages(await cr.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // Poll for new chat messages while Chat tab is open
  useEffect(() => {
    if (tab !== 'chat' || !lead?.whatsapp_chat_id) return;
    const fetchMessages = async () => {
      try {
        const cr = await apiFetch(`/whatsapp/chat/${encodeURIComponent(lead.whatsapp_chat_id)}/messages?leadId=${id}`);
        if (cr.ok) setChatMessages(await cr.json());
      } catch { /* ignore */ }
    };
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [tab, lead?.whatsapp_chat_id, id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const updateStatus = async (status) => {
    const prevStatus = lead?.status;
    setEditStatus(status);
    try {
      const res = await apiFetch(`/crm/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      setLead((l) => ({ ...l, status }));
    } catch {
      setEditStatus(prevStatus);
      alert('Failed to update status');
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.note.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/crm/leads/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify(newNote),
      });
      if (res.ok) {
        const saved = await res.json();
        setNotes((n) => [saved, ...n]);
        setNewNote({ note: '', type: 'GENERAL' });
      }
    } finally { setSaving(false); }
  };

  const addFollowUp = async (e) => {
    e.preventDefault();
    if (!newFu.due_date) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/crm/leads/${id}/followups`, {
        method: 'POST',
        body: JSON.stringify(newFu),
      });
      if (res.ok) {
        const saved = await res.json();
        setFollowups((f) => [...f, saved]);
        setNewFu({ due_date: '', note: '' });
      }
    } finally { setSaving(false); }
  };

  const completeFu = async (fid) => {
    await apiFetch(`/crm/leads/${id}/followups/${fid}/complete`, { method: 'PATCH' });
    setFollowups((fus) => fus.map((f) => f.id === fid ? { ...f, is_completed: true } : f));
  };

  const handleConvertClick = async () => {
    const res = await apiFetch(`/crm/leads/${id}/convert`, { method: 'POST' });
    const data = await res.json();
    if (data.customerExists) {
      navigate(`/quotation?customerId=${data.customerId}&leadId=${id}`);
    } else {
      setConvertData(data);
      setShowConvert(true);
    }
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !lead?.whatsapp_chat_id) return;
    const res = await apiFetch('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ chatId: lead.whatsapp_chat_id, message: chatInput }),
    });
    if (res.ok) {
      setChatMessages((m) => [...m, { direction: 'OUTBOUND', body: chatInput, timestamp: new Date().toISOString() }]);
      setChatInput('');
    }
  };

  const inp = { width: '100%', padding: '9px 11px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 13, boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 3, textTransform: 'uppercase' };
  const tabBtn = (t) => ({
    padding: '7px 16px', border: 'none', borderRadius: '6px 6px 0 0',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: tab === t ? '#fff' : theme.surface,
    color: tab === t ? theme.primary : theme.textMuted,
    borderBottom: tab === t ? `2px solid ${theme.primary}` : '2px solid transparent',
  });

  if (loading) return <PageLayout title="Lead Detail"><p style={{ color: theme.textMuted, padding: 20 }}>Loading...</p></PageLayout>;
  if (!lead) return null;

  return (
    <PageLayout title={`Lead: ${lead.name}`}>
      {showConvert && convertData && (
        <ConvertToCustomerModal
          lead={lead}
          prefillData={convertData.prefillData}
          onClose={() => setShowConvert(false)}
        />
      )}

      {/* Lead card */}
      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{lead.name}</h3>
            <p style={{ margin: '0 0 2px', fontSize: 14 }}>{lead.phone}{lead.email ? ` · ${lead.email}` : ''}</p>
            <p style={{ margin: 0, fontSize: 12, color: theme.textMuted }}>
              {SOURCE_LABELS[lead.source] || lead.source} · {lead.lead_priority} priority
              {lead.product_interest ? ` · ${lead.product_interest}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <select
              value={editStatus}
              onChange={(e) => updateStatus(e.target.value)}
              style={{ ...inp, width: 'auto', fontWeight: 700, color: STATUS_COLORS[editStatus] || theme.text }}
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {canConvert() && lead.status !== 'CONVERTED' && (
              <button
                onClick={handleConvertClick}
                style={{ padding: '7px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Convert to Quotation
              </button>
            )}
          </div>
        </div>

        {lead.notes && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: theme.surface, borderRadius: 6, fontSize: 13 }}>
            {lead.notes}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/crm/leads/new?name=${lead.name}&phone=${lead.phone}&email=${lead.email || ''}`)}
            style={{ padding: '6px 14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            Edit Lead
          </button>
          <a
            href={`https://wa.me/91${lead.phone}`}
            target="_blank" rel="noreferrer"
            style={{ padding: '6px 14px', background: '#25D366', color: '#fff', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}
          >
            WhatsApp
          </a>
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              style={{ padding: '6px 14px', background: '#6c757d', color: '#fff', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}
            >
              Email
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${theme.border}`, marginBottom: 0 }}>
        <button style={tabBtn('notes')} onClick={() => setTab('notes')}>Notes ({notes.length})</button>
        <button style={tabBtn('followups')} onClick={() => setTab('followups')}>Follow-ups ({followups.length})</button>
        {lead.whatsapp_chat_id && (
          <button style={tabBtn('chat')} onClick={() => setTab('chat')}>Chat</button>
        )}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16 }}>
        {/* Notes tab */}
        {tab === 'notes' && (
          <>
            <form onSubmit={addNote} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                style={{ ...inp, width: 120 }}
                value={newNote.type}
                onChange={(e) => setNewNote((n) => ({ ...n, type: e.target.value }))}
              >
                {NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="Add a note..."
                value={newNote.note}
                onChange={(e) => setNewNote((n) => ({ ...n, note: e.target.value }))}
              />
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '9px 16px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Add
              </button>
            </form>
            {notes.length === 0 && <p style={{ color: theme.textMuted, fontSize: 13 }}>No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} style={{ padding: '8px 12px', borderRadius: 6, background: theme.surface, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, marginRight: 8 }}>{n.type}</span>
                <span style={{ fontSize: 13 }}>{n.note}</span>
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  {new Date(n.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Follow-ups tab */}
        {tab === 'followups' && (
          <>
            <form onSubmit={addFollowUp} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                type="datetime-local" style={{ ...inp, width: 200 }}
                value={newFu.due_date}
                onChange={(e) => setNewFu((f) => ({ ...f, due_date: e.target.value }))}
                required
              />
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="Note (optional)"
                value={newFu.note}
                onChange={(e) => setNewFu((f) => ({ ...f, note: e.target.value }))}
              />
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '9px 16px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Schedule
              </button>
            </form>
            {followups.length === 0 && <p style={{ color: theme.textMuted, fontSize: 13 }}>No follow-ups scheduled.</p>}
            {followups.map((f) => (
              <div
                key={f.id}
                style={{
                  padding: '8px 12px', borderRadius: 6, marginBottom: 8,
                  background: f.is_completed ? '#d1e7dd' : theme.surface,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {new Date(f.due_date).toLocaleString('en-IN')}
                  </span>
                  {f.note && <span style={{ fontSize: 12, color: theme.textMuted, marginLeft: 8 }}>{f.note}</span>}
                </div>
                {!f.is_completed && (
                  <button
                    onClick={() => completeFu(f.id)}
                    style={{ padding: '4px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}
                  >
                    Done
                  </button>
                )}
                {f.is_completed && <span style={{ fontSize: 11, color: '#198754', fontWeight: 700 }}>Completed</span>}
              </div>
            ))}
          </>
        )}

        {/* Chat tab — polls every 4s for new inbound messages */}
        {tab === 'chat' && (
          <div>
            <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12, padding: 4 }}>
              {chatMessages.length === 0 && <p style={{ color: theme.textMuted, fontSize: 13 }}>No messages yet.</p>}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: m.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '75%', padding: '8px 12px', borderRadius: 10, fontSize: 13,
                      background: m.direction === 'OUTBOUND' ? theme.primary : theme.surface,
                      color: m.direction === 'OUTBOUND' ? '#fff' : theme.text,
                    }}
                  >
                    {m.body}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                      {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={sendChat} style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                style={{ padding: '9px 16px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
