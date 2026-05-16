import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { theme } from '../theme';
import ConvertToCustomerModal from './ConvertToCustomerModal';
import LeadTimeline from './LeadTimeline';
import ActivityTimeline from '../components/activity/ActivityTimeline';
import { useCurrentUser } from '../utils/useCurrentUser';
import { toast } from '../utils/toast';
import { WAITING_L2_MINS, WAITING_L3_MINS, OVERDUE_MINS, VALID_TRANSITIONS } from './crmConstants';
import CustomerIntelPanel from './CustomerIntelPanel';
import { SOURCE_LABELS } from './crmSourceLabels';

const URGENCY_BG = { HIGH: '#fff3f3', MEDIUM: '#fffbea', LOW: '#f8f9fa' };
const URGENCY_BORDER = { HIGH: '#dc3545', MEDIUM: '#ffc107', LOW: '#6c757d' };

const STATUS_COLORS = {
  NEW: '#ffc107', CONTACTED: '#0d6efd', INTERESTED: '#198754',
  QUOTATION: '#6f42c1', CONVERTED: '#198754', LOST: '#dc3545',
};
const STATUS_DESCRIPTIONS = {
  NEW:        'Lead received, first contact pending',
  CONTACTED:  'Initial communication completed',
  INTERESTED: 'Customer showed buying intent',
  QUOTATION:  'Quotation shared or under preparation',
  CONVERTED:  'Customer / order confirmed',
  LOST:       'Lead closed or not responding',
};
// Forward stages shown in order; LOST is visually separated below
const FORWARD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'QUOTATION', 'CONVERTED'];
const NOTE_TYPES = ['GENERAL'];


function waitingInfo(lead) {
  if (!lead || ['CONVERTED', 'LOST'].includes(lead.status)) return null;
  const replyAt = lead.last_customer_reply_at ? +new Date(lead.last_customer_reply_at) : null;
  const salesAt = lead.last_salesman_reply_at ? +new Date(lead.last_salesman_reply_at) : null;
  if (!replyAt) return null;
  if (salesAt && salesAt >= replyAt) return null;
  const waitMs = Date.now() - replyAt;
  if (waitMs <= 0) return null;
  const waitMins = Math.floor(waitMs / 60000);
  if (waitMins < WAITING_L2_MINS) return null;
  const age = waitMins >= 60 ? `${Math.floor(waitMins / 60)}h ${waitMins % 60}m` : `${waitMins}m`;
  if (waitMins >= OVERDUE_MINS)   return { text: `WAITING · ${age}`, bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
  if (waitMins >= WAITING_L3_MINS) return { text: `WAITING · ${age}`, bg: '#ffedd5', color: '#9a3412', border: '#fb923c' };
  return { text: `WAITING · ${age}`, bg: '#fef9c3', color: '#854d0e', border: '#fde047' };
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user: currentUser } = useCurrentUser();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('timeline');
  const [newNote, setNewNote] = useState({ note: '', type: 'GENERAL' });
  const [newFu, setNewFu] = useState({ due_date: '', note: '' });
  const [editStatus, setEditStatus] = useState('');
  const [showConvert, setShowConvert] = useState(false);
  const [convertData, setConvertData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSnoozePanel, setShowSnoozePanel] = useState(false);
  const [snoozeReason, setSnoozeReason] = useState('');
  const [snoozingAuto, setSnoozingAuto] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);
  const [decision, setDecision] = useState(null);
  const [users, setUsers] = useState([]);
  const [showReassign, setShowReassign] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [customerMatch, setCustomerMatch] = useState(undefined); // undefined=loading, null=no match
  const [pendingStatus, setPendingStatus] = useState(null); // status awaiting confirmation
  const [showOverride, setShowOverride] = useState(false);  // manager/admin override toggle

  // ── Call timer
  const [callStage, setCallStage] = useState('idle'); // idle | calling | connected | not_reached
  const [callSecs, setCallSecs] = useState(0);

  // ── Product search
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);

  // ── Structured outcome
  const [outcomeMode, setOutcomeMode] = useState(null); // INTERESTED | NO_ANSWER | LATER | NOT_INTERESTED
  const [outcomeForm, setOutcomeForm] = useState({ note: '', quantity: '', budget: '', requirement: '', reason: '', followUpDate: '', objectionType: '' });
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // ── WhatsApp CTA (shown after outcome save)
  const [waCtaMsg, setWaCtaMsg] = useState(null);
  const [waTracked, setWaTracked] = useState(false);

  // ── Objection help
  const [objTopic, setObjTopic] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/crm/leads/${id}`);
      if (!res.ok) { navigate('/crm/leads'); return; }
      const data = await res.json();
      setLead(data);
      setNotes(data.activityNotes || []);
      setFollowups(data.followups || []);
      setEditStatus(data.status);

      if (data.whatsapp_chat_id) {
        const cr = await apiFetch(`/whatsapp/chat/${encodeURIComponent(data.whatsapp_chat_id)}/messages?leadId=${id}`);
        if (cr.ok) setChatMessages(await cr.json());
      }

      const dr = await apiFetch(`/crm/leads/${id}/decision`);
      if (dr.ok) setDecision(await dr.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiFetch('/users/dropdown')
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Customer intelligence match — loaded once per lead (AbortController prevents stale state
  // when navigating between leads quickly)
  useEffect(() => {
    const ctrl = new AbortController();
    setCustomerMatch(undefined);
    apiFetch(`/crm/leads/${id}/customer-match`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!ctrl.signal.aborted) setCustomerMatch(data?.matched ? data : null);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setCustomerMatch(null);
      });
    return () => ctrl.abort();
  }, [id]);

  // Poll for new chat messages while Chat tab is open — 15 s interval, in-flight guard
  useEffect(() => {
    if (tab !== 'chat' || !lead?.whatsapp_chat_id) return;
    let inFlight = false;
    const fetchMessages = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const cr = await apiFetch(`/whatsapp/chat/${encodeURIComponent(lead.whatsapp_chat_id)}/messages?leadId=${id}`);
        if (cr.ok) setChatMessages(await cr.json());
      } catch { /* ignore */ } finally {
        inFlight = false;
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 15_000);
    return () => clearInterval(interval);
  }, [tab, lead?.whatsapp_chat_id, id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Call timer — ticks while call is active
  useEffect(() => {
    if (callStage !== 'calling' && callStage !== 'connected') return;
    const t = setInterval(() => setCallSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callStage]);

  // Product search — debounced 300 ms
  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      setProductSearching(true);
      try {
        const r = await apiFetch(`/items/search?q=${encodeURIComponent(productQuery)}`);
        if (r.ok) setProductResults(await r.json());
      } catch { /* ignore */ } finally { setProductSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery]);

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
      toast.error('Failed to update status');
    }
  };

  // Intercepts status dropdown changes — enforces confirmation and routes CONVERTED
  // to the existing modal flow so a Customer record is always created properly.
  const handleStatusChange = (newStatus) => {
    if (newStatus === editStatus) return;
    if (newStatus === 'CONVERTED') {
      // Route through ConvertToCustomerModal — never do a raw status=CONVERTED PUT.
      // The modal creates the Customer record and then marks the lead converted.
      handleConvertClick();
      return;
    }
    if (newStatus === 'LOST') {
      setPendingStatus('LOST');
      return;
    }
    updateStatus(newStatus);
  };

  const confirmPendingStatus = () => {
    if (pendingStatus) updateStatus(pendingStatus);
    setPendingStatus(null);
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

  const handlePauseResume = async (willPause) => {
    setSnoozingAuto(true);
    const reason = willPause ? `Manually paused by ${currentUser?.name || 'user'}` : 'Manually resumed';
    try {
      const res = await apiFetch(`/crm/leads/${id}/automation`, {
        method: 'PATCH',
        body: JSON.stringify({ paused: willPause, reason }),
      });
      if (res.ok) await load();
    } finally { setSnoozingAuto(false); }
  };

  const handleSnooze = async (durationMins) => {
    if (!snoozeReason.trim()) { document.getElementById('snoozeReasonInput')?.focus(); return; }
    setSnoozingAuto(true);
    try {
      const res = await apiFetch(`/crm/leads/${id}/automation/snooze`, {
        method: 'POST',
        body: JSON.stringify({ durationMins, reason: snoozeReason.trim() }),
      });
      if (res.ok) { setShowSnoozePanel(false); setSnoozeReason(''); await load(); }
    } finally { setSnoozingAuto(false); }
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

  const reassign = async (userId) => {
    if (!userId || reassigning) return;
    setReassigning(true);
    try {
      const res = await apiFetch(`/crm/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ assigned_to: Number(userId) }),
      });
      if (res.ok) {
        const assignedUser = users.find((u) => String(u.id) === String(userId));
        setLead((l) => ({ ...l, assigned_to: Number(userId), assignedUser }));
        setShowReassign(false);
        toast.success(`Lead reassigned to ${assignedUser?.name || 'user'}`);
      } else {
        toast.error('Failed to reassign lead');
      }
    } finally { setReassigning(false); }
  };

  // ── Workspace helpers ────────────────────────────────────────────────────────

  const fmtSecs = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

  const presetFollowUpTimes = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const t9am = new Date(now); t9am.setDate(now.getDate() + 1); t9am.setHours(9, 0, 0, 0);
    const t2d  = new Date(now); t2d.setDate(now.getDate() + 2); t2d.setHours(10, 0, 0, 0);
    const t1w  = new Date(now); t1w.setDate(now.getDate() + 7); t1w.setHours(10, 0, 0, 0);
    return [
      { label: 'Tomorrow 9am', value: fmt(t9am) },
      { label: 'In 2 days',    value: fmt(t2d) },
      { label: 'Next week',    value: fmt(t1w) },
    ];
  };

  const buildWaMessage = (mode) => {
    const firstName = (lead?.name || '').split(' ')[0] || 'there';
    const product = lead?.product_interest || 'our products';
    const callerLine = currentUser?.name ? `\n${currentUser.name}` : '';
    switch (mode) {
      case 'INTERESTED':
        return `Namaste ${firstName},\n\nThank you for your interest in ${product}!\n\nWe are preparing a quotation and will share it with you shortly.\n\nRegards,${callerLine}\nHesh Store Team`;
      case 'NO_ANSWER':
        return `Namaste ${firstName},\n\nWe tried calling you regarding your enquiry about ${product}. Please give us a call back or reply here and we will contact you.\n\nRegards,${callerLine}\nHesh Store Team`;
      case 'LATER':
        return `Namaste ${firstName},\n\nThank you for speaking with us about ${product}. We will follow up as discussed. Feel free to reach out anytime.\n\nRegards,${callerLine}\nHesh Store Team`;
      default:
        return `Namaste ${firstName},\n\nThank you for your time. Do let us know if you need any information about ${product}.\n\nRegards,${callerLine}\nHesh Store Team`;
    }
  };

  const trackWaOpen = async () => {
    try {
      await apiFetch(`/crm/leads/${id}/log-action`, {
        method: 'POST',
        body: JSON.stringify({ note: `WhatsApp opened — sent to ${lead?.phone}`, noteType: 'SYSTEM' }),
      });
    } catch { /* non-critical */ }
  };

  const logStructuredOutcome = async () => {
    if (submittingOutcome || !outcomeMode) return;
    setSubmittingOutcome(true);
    try {
      const durPart = callSecs > 0 ? ` [Call: ${fmtSecs(callSecs)}]` : '';
      let noteText = '';
      let newStatus = null;
      let fuDate = null;
      let fuNote = null;

      if (outcomeMode === 'INTERESTED') {
        const parts = ['✅ Interested' + durPart];
        if (outcomeForm.quantity)    parts.push(`Qty: ${outcomeForm.quantity}`);
        if (outcomeForm.budget)      parts.push(`Budget: ₹${outcomeForm.budget}`);
        if (outcomeForm.requirement) parts.push(outcomeForm.requirement);
        if (outcomeForm.note)        parts.push(outcomeForm.note);
        noteText  = parts.join('. ');
        newStatus = decision?.nextAction?.nextStatusOnComplete;
      } else if (outcomeMode === 'NO_ANSWER') {
        noteText  = `📵 No answer${durPart}. ${outcomeForm.note || ''}`.trimEnd();
        const t9am = new Date(); t9am.setDate(t9am.getDate() + 1); t9am.setHours(9, 0, 0, 0);
        fuDate    = outcomeForm.followUpDate || t9am.toISOString();
        fuNote    = 'No answer — rescheduled';
      } else if (outcomeMode === 'LATER') {
        const parts = ['⏰ Will buy later' + durPart];
        if (outcomeForm.reason) parts.push(outcomeForm.reason);
        if (outcomeForm.note)   parts.push(outcomeForm.note);
        noteText  = parts.join('. ');
        fuDate    = outcomeForm.followUpDate;
        fuNote    = outcomeForm.reason || 'Will buy later';
      } else if (outcomeMode === 'NOT_INTERESTED') {
        const parts = ['❌ Not interested' + durPart];
        if (outcomeForm.reason)        parts.push(outcomeForm.reason);
        if (outcomeForm.objectionType) parts.push(`Objection: ${outcomeForm.objectionType}`);
        if (outcomeForm.note)          parts.push(outcomeForm.note);
        noteText = parts.join('. ');
      }

      // CONVERTED always goes through the modal so a Customer record is created
      if (newStatus === 'CONVERTED') {
        await apiFetch(`/crm/leads/${id}/log-action`, {
          method: 'POST',
          body: JSON.stringify({ note: noteText, noteType: 'CALL' }),
        });
        setWaCtaMsg(buildWaMessage('INTERESTED'));
        setWaTracked(false);
        handleConvertClick();
        return;
      }

      const res = await apiFetch(`/crm/leads/${id}/log-action`, {
        method: 'POST',
        body: JSON.stringify({ note: noteText, noteType: 'CALL', ...(newStatus ? { newStatus } : {}) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to log outcome');
        return;
      }

      if (fuDate) {
        await apiFetch(`/crm/leads/${id}/followups`, {
          method: 'POST',
          body: JSON.stringify({ due_date: fuDate, note: fuNote }),
        });
      }

      setWaCtaMsg(buildWaMessage(outcomeMode));
      setWaTracked(false);
      setOutcomeMode(null);
      setOutcomeForm({ note: '', quantity: '', budget: '', requirement: '', reason: '', followUpDate: '', objectionType: '' });
      setCallStage('idle');
      setCallSecs(0);
      await load();
    } finally {
      setSubmittingOutcome(false);
    }
  };

  const inp = { width: '100%', padding: '9px 11px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 13, boxSizing: 'border-box' };
  const tabBtn = (t) => ({
    padding: '7px 16px', border: 'none', borderRadius: '6px 6px 0 0',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: tab === t ? '#fff' : theme.surface,
    color: tab === t ? theme.primary : theme.textMuted,
    borderBottom: tab === t ? `2px solid ${theme.primary}` : '2px solid transparent',
  });

  if (loading) return <PageLayout title="Lead Detail"><p style={{ color: theme.textMuted, padding: 20 }}>Loading...</p></PageLayout>;
  if (!lead) return null;

  const wInfo = waitingInfo(lead);
  const canConvert = hasPermission('lead.convert') && lead.status !== 'CONVERTED' && lead.status !== 'LOST';
  const canEdit = hasPermission('lead.edit');
  const phoneDigits = normalizePhoneForWhatsApp(lead.phone);

  return (
    <PageLayout title={`Lead: ${lead.name}`}>
      {showConvert && convertData && (
        <ConvertToCustomerModal
          lead={lead}
          prefillData={convertData.prefillData}
          onClose={() => setShowConvert(false)}
        />
      )}

      {/* Customer Intelligence Panel */}
      <CustomerIntelPanel match={customerMatch} leadId={id} />

      {/* ── Unified Telecaller Workspace ─────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        border: `1.5px solid ${
          wInfo ? wInfo.border :
          (decision?.nextAction?.urgency ? URGENCY_BORDER[decision.nextAction.urgency] : theme.border)
        }`,
        borderRadius: 10,
        marginBottom: 14,
        overflow: 'hidden',
      }}>

        {/* ── Header: identity + badges ── */}
        <div style={{
          background: wInfo ? wInfo.bg :
            (decision?.nextAction?.urgency ? URGENCY_BG[decision.nextAction.urgency] : '#f8f9fa'),
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.border}`,
        }}>
          {/* Badge row — identity chips + manager override control */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap', marginBottom: 8, justifyContent: 'space-between' }}>
            {/* Left: reference + signal badges */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {lead.lead_ref && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd',
                  fontFamily: 'monospace', letterSpacing: '0.03em',
                }}>
                  {lead.lead_ref}
                </span>
              )}
              {decision?.nextAction?.label && decision.nextAction.action !== 'NONE' && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                  background: URGENCY_BORDER[decision.nextAction.urgency] || '#374151',
                  color: '#fff',
                }}>
                  {decision.nextAction.label}
                </span>
              )}
              {wInfo && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                  background: wInfo.bg, color: wInfo.color, border: `1px solid ${wInfo.border}`,
                }}>
                  ⏳ {wInfo.text}
                </span>
              )}
              {customerMatch && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                  background: '#dcfce7', color: '#15803d', border: '1px solid #86efac',
                }}>
                  Existing Customer
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                background: '#f1f5f9', color: '#64748b',
              }}>
                {SOURCE_LABELS[lead.source] || lead.source}
              </span>
            </div>
            {/* Right: manager/admin override (hidden from telecallers without lead.edit) */}
            {canEdit && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {!['CONVERTED', 'LOST'].includes(lead.status) && VALID_TRANSITIONS[editStatus]?.includes('LOST') && (
                    <button
                      onClick={() => handleStatusChange('LOST')}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', cursor: 'pointer' }}
                    >
                      Mark Lost
                    </button>
                  )}
                  <button
                    onClick={() => setShowOverride((v) => !v)}
                    style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 5, cursor: 'pointer', background: showOverride ? '#e0f2fe' : '#f3f4f6', color: showOverride ? '#0369a1' : '#6b7280', border: `1px solid ${showOverride ? '#bae6fd' : '#e5e7eb'}` }}
                  >
                    {showOverride ? '▲ Override' : '⚙ Override'}
                  </button>
                </div>
                {showOverride && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <select
                      value={editStatus}
                      onChange={(e) => { handleStatusChange(e.target.value); setShowOverride(false); }}
                      style={{ ...inp, width: 'auto', fontWeight: 500, color: '#374151', fontSize: 11, padding: '4px 7px', background: '#fff', borderColor: '#bae6fd' }}
                    >
                      <optgroup label="Stage">
                        {FORWARD_STATUSES.map((s) => {
                          const allowed = VALID_TRANSITIONS[editStatus]?.includes(s) || s === editStatus;
                          return (
                            <option key={s} value={s} disabled={!allowed}>
                              {s === editStatus ? `● ${s}` : `↳ ${s}`}
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label="──────">
                        <option value="LOST" disabled={!VALID_TRANSITIONS[editStatus]?.includes('LOST') && editStatus !== 'LOST'}>
                          {editStatus === 'LOST' ? '● LOST' : '✕ LOST'}
                        </option>
                      </optgroup>
                    </select>
                    {STATUS_DESCRIPTIONS[editStatus] && (
                      <div style={{ fontSize: 9, color: '#9ca3af', textAlign: 'right', maxWidth: 150 }}>
                        {STATUS_DESCRIPTIONS[editStatus]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Progression strip — read-only stage tracker ── */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, overflowX: 'auto' }}>
            {FORWARD_STATUSES.map((s, i) => {
              const statusIdx = FORWARD_STATUSES.indexOf(lead.status);
              const isDone    = statusIdx > i;
              const isCurrent = s === lead.status;
              const nodeColor = isDone ? '#16a34a' : isCurrent ? (STATUS_COLORS[s] || '#374151') : '#d1d5db';
              const textColor = isDone ? '#15803d' : isCurrent ? (STATUS_COLORS[s] || '#374151') : '#9ca3af';
              return (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{
                      width: 17, height: 17, borderRadius: '50%',
                      background: isDone || isCurrent ? nodeColor : '#f3f4f6',
                      border: `2px solid ${nodeColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                      {isDone ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: isCurrent ? 700 : 500, color: textColor, whiteSpace: 'nowrap' }}>
                      {s}
                    </span>
                  </div>
                  {i < FORWARD_STATUSES.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: isDone ? '#16a34a' : '#e5e7eb', minWidth: 6, maxWidth: 24, margin: '0 3px' }} />
                  )}
                </React.Fragment>
              );
            })}
            {lead.status === 'LOST' && (
              <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', flexShrink: 0 }}>
                ✕ LOST
              </span>
            )}
          </div>

          {/* Customer name — dominant */}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111', lineHeight: 1.2, marginBottom: 6 }}>
            {lead.name}
          </div>

          {/* Product interest — very prominent */}
          {lead.product_interest && (
            <div style={{
              fontSize: 16, fontWeight: 700, color: '#1d4ed8',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 7, padding: '7px 12px', marginBottom: 10,
              display: 'inline-block', maxWidth: '100%',
            }}>
              📦 {lead.product_interest}
            </div>
          )}

          {/* Phone (tap to call) + email + city */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            {lead.phone ? (
              <a href={`tel:+91${phoneDigits}`} style={{ fontSize: 15, fontWeight: 700, color: theme.primary, textDecoration: 'none' }}>
                {lead.phone}
              </a>
            ) : (
              <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No phone</span>
            )}
            {lead.email && <span style={{ fontSize: 12, color: '#374151' }}>{lead.email}</span>}
            {lead.city && <span style={{ fontSize: 13, color: '#9ca3af' }}>{lead.city}</span>}
          </div>

          {/* Assigned user + reassign + edit links */}
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            Assigned: <strong>{lead.assignedUser?.name || 'Unassigned'}</strong>
            {canEdit && (
              <button
                onClick={() => setShowReassign((v) => !v)}
                style={{ marginLeft: 8, fontSize: 11, color: theme.primary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                {showReassign ? 'Cancel' : 'Reassign'}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => navigate(`/crm/leads/${id}/edit`)}
                style={{ marginLeft: 10, fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Edit
              </button>
            )}
          </div>
          {showReassign && (
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select
                onChange={(e) => reassign(e.target.value)}
                disabled={reassigning}
                defaultValue=""
                style={{ ...inp, width: 'auto', fontSize: 12 }}
              >
                <option value="" disabled>Select user to assign…</option>
                {users
                  .filter((u) => ['Tele calling Executive','Territory Manager','Field Executive','Sales Manager'].includes(u.role))
                  .map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
              {reassigning && <span style={{ fontSize: 12, color: theme.textMuted, alignSelf: 'center' }}>Saving…</span>}
            </div>
          )}

          {/* Customer + quotation links after conversion */}
          {lead.status === 'CONVERTED' && lead.customer_id && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => navigate('/customers')}
                style={{ fontSize: 12, color: '#198754', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                View Customer Profile →
              </button>
              {hasPermission('quotation.view') && (
                <button
                  onClick={() => navigate(`/quotation?customerId=${lead.customer_id}&leadId=${id}`)}
                  style={{ marginLeft: 12, fontSize: 12, color: '#6f42c1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  New Quotation →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Journey summary strip ── */}
        {lead.journey && (lead.journey.quotations?.length > 0 || lead.journey.orders?.length > 0) && (
          <div style={{
            padding: '8px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0',
            display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
          }}>
            {lead.journey.quotations?.length > 0 && (
              <span style={{ fontSize: 12, color: '#166534' }}>
                <strong>Quotations:</strong>{' '}
                {lead.journey.quotations.map((q) => (
                  <span
                    key={q.id}
                    onClick={() => navigate(`/quotations/${q.id}`)}
                    style={{ cursor: 'pointer', textDecoration: 'underline', marginRight: 6, color: '#6f42c1' }}
                  >
                    {q.quotation_no || `Q-${q.id}`}
                  </span>
                ))}
              </span>
            )}
            {lead.journey.orders?.length > 0 && (
              <span style={{ fontSize: 12, color: '#166534' }}>
                <strong>Orders:</strong>{' '}
                {lead.journey.orders.map((o) => (
                  <span
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    style={{ cursor: 'pointer', textDecoration: 'underline', marginRight: 6, color: '#0369a1' }}
                  >
                    {o.order_no || `O-${o.id}`}
                  </span>
                ))}
              </span>
            )}
            {lead.journey.totalRevenue > 0 && (
              <span style={{ fontSize: 12, color: '#166534' }}>
                <strong>Revenue:</strong> ₹{Number(lead.journey.totalRevenue).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        )}

        {/* ── LOST confirmation panel ── */}
        {pendingStatus === 'LOST' && (
          <div style={{
            padding: '12px 16px', background: '#fef2f2',
            borderBottom: '1px solid #fca5a5',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
              Mark this lead as Lost?
            </div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 10, lineHeight: 1.5 }}>
              The lead will be closed and removed from active queues. You can revive it later by moving it back to Contacted.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmPendingStatus}
                style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}
              >
                Confirm Lost
              </button>
              <button
                onClick={() => setPendingStatus(null)}
                style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Call script — always visible when present, no toggle ── */}
        {decision?.nextAction?.script && (
          <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#92400e',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
            }}>
              📞 Call Script
            </div>
            <pre style={{
              margin: 0, fontSize: 13, color: '#1f2937',
              whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.65,
            }}>
              {decision.nextAction.script}
            </pre>
          </div>
        )}

        {/* ── Lead context: requirement + notes ── */}
        {(lead.requirement_note || lead.notes) && (
          <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: `1px solid ${theme.border}` }}>
            {lead.requirement_note && (
              <div style={{
                fontSize: 12, color: '#15803d',
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 5, padding: '5px 10px',
                marginBottom: lead.notes ? 6 : 0,
              }}>
                <strong>Requirement:</strong> {lead.requirement_note}
              </div>
            )}
            {lead.notes && (
              <div style={{ fontSize: 12, color: '#374151' }}>
                <strong>Notes:</strong> {lead.notes}
              </div>
            )}
          </div>
        )}

        {/* ── CALL CONTROLS ── */}
        {decision?.nextAction && decision.nextAction.action !== 'NONE' && lead.phone && (
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border}` }}>
            {callStage === 'idle' && (
              <button
                onClick={() => {
                  window.location.href = `tel:+91${phoneDigits}`;
                  setTimeout(() => { setCallStage('calling'); setCallSecs(0); }, 600);
                }}
                style={{ width: '100%', padding: '11px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                📞 Start Call — {lead.phone}
              </button>
            )}
            {callStage !== 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', fontFamily: 'monospace', background: '#e0f2fe', padding: '4px 10px', borderRadius: 6 }}>
                  {callStage === 'calling' ? '📞' : callStage === 'connected' ? '✅' : '❌'} {fmtSecs(callSecs)}
                </span>
                {callStage === 'calling' && (
                  <>
                    <button onClick={() => setCallStage('connected')} style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      ✅ Connected
                    </button>
                    <button onClick={() => { setCallStage('not_reached'); setOutcomeMode('NO_ANSWER'); }} style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      ❌ No Answer
                    </button>
                  </>
                )}
                {callStage !== 'idle' && (
                  <button onClick={() => { setCallStage('idle'); setCallSecs(0); }} style={{ marginLeft: 'auto', padding: '4px 10px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCT / ITEM SEARCH ── */}
        <div style={{ borderBottom: `1px solid ${theme.border}` }}>
          <button
            onClick={() => setShowProductSearch((v) => !v)}
            style={{ width: '100%', padding: '9px 16px', textAlign: 'left', background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>🔍 Product / Item Search</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{showProductSearch ? '▲ hide' : '▼ show'}</span>
          </button>
          {showProductSearch && (
            <div style={{ padding: '8px 16px 12px' }}>
              <input
                style={{ width: '100%', padding: '8px 11px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
                placeholder="Search by item name or SKU code..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                autoFocus
              />
              {productSearching && <div style={{ fontSize: 12, color: '#6b7280' }}>Searching...</div>}
              {productResults.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                  {item.image
                    ? <img src={item.image} alt={item.itemName} style={{ width: 44, height: 44, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 5, background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>{item.itemName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace' }}>{item.sku}</span>
                      {item.unit && <span> · {item.unit}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>₹{Number(item.sellingPrice || 0).toLocaleString('en-IN')}</span>
                      {item.wholesale_price > 0 && item.wholesale_price !== item.sellingPrice && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Min ₹{Number(item.wholesale_price).toLocaleString('en-IN')}</span>
                      )}
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                        background: item.mainCategoryType === 'MANUFACTURING' ? '#ede9fe' : '#e0f2fe',
                        color: item.mainCategoryType === 'MANUFACTURING' ? '#6d28d9' : '#0369a1',
                      }}>
                        {item.mainCategoryType === 'MANUFACTURING' ? 'Mfg · 2–3 wks' : 'Trading · 2–3 days'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {!productSearching && productQuery.trim() && productResults.length === 0 && (
                <div style={{ fontSize: 12, color: '#9ca3af', paddingTop: 4 }}>No items found for "{productQuery}"</div>
              )}
            </div>
          )}
        </div>

        {/* ── STRUCTURED OUTCOME PANEL ── */}
        {decision?.nextAction && decision.nextAction.action !== 'NONE' && (
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>
            {/* Outcome mode selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { key: 'INTERESTED',    label: '✅ Interested',     bg: '#dcfce7', color: '#15803d', border: '#86efac' },
                { key: 'NO_ANSWER',     label: '📵 No Answer',      bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
                { key: 'LATER',         label: '⏰ Call Back Later', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
                { key: 'NOT_INTERESTED',label: '❌ Not Interested',  bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
              ].map(({ key, label, bg, color, border }) => (
                <button
                  key={key}
                  onClick={() => setOutcomeMode(outcomeMode === key ? null : key)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: outcomeMode === key ? bg : '#fff', color: outcomeMode === key ? color : '#6b7280', border: `1px solid ${outcomeMode === key ? border : '#e5e7eb'}` }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* INTERESTED */}
            {outcomeMode === 'INTERESTED' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Quantity</label>
                    <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #86efac', fontSize: 13, boxSizing: 'border-box' }} placeholder="e.g. 50 pcs" value={outcomeForm.quantity} onChange={(e) => setOutcomeForm((f) => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Budget (₹)</label>
                    <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #86efac', fontSize: 13, boxSizing: 'border-box' }} placeholder="e.g. 25000" value={outcomeForm.budget} onChange={(e) => setOutcomeForm((f) => ({ ...f, budget: e.target.value }))} />
                  </div>
                </div>
                <textarea
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #86efac', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }}
                  placeholder="Requirement, customisation, delivery address..."
                  rows={2}
                  value={outcomeForm.requirement}
                  onChange={(e) => setOutcomeForm((f) => ({ ...f, requirement: e.target.value }))}
                />
                <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #86efac', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }} placeholder="Additional note..." value={outcomeForm.note} onChange={(e) => setOutcomeForm((f) => ({ ...f, note: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={logStructuredOutcome} disabled={submittingOutcome} style={{ flex: 1, padding: '9px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submittingOutcome ? 0.7 : 1 }}>
                    {submittingOutcome ? 'Saving...' : decision.nextAction.nextStatusOnComplete === 'CONVERTED' ? 'Convert to Customer →' : `Save → ${decision.nextAction.nextStatusOnComplete || 'Next Stage'}`}
                  </button>
                  {canConvert && (
                    <button onClick={handleConvertClick} style={{ padding: '9px 14px', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      Quotation →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* NO ANSWER */}
            {outcomeMode === 'NO_ANSWER' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
                  Auto-schedules follow-up for <strong>tomorrow at 9:00 AM</strong> unless you pick a different time:
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {presetFollowUpTimes().map((p) => (
                    <button key={p.label} onClick={() => setOutcomeForm((f) => ({ ...f, followUpDate: p.value }))} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: outcomeForm.followUpDate === p.value ? '#dc2626' : '#fff', color: outcomeForm.followUpDate === p.value ? '#fff' : '#374151', border: `1px solid ${outcomeForm.followUpDate === p.value ? '#dc2626' : '#fca5a5'}` }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <input type="datetime-local" style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #fca5a5', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} value={outcomeForm.followUpDate} onChange={(e) => setOutcomeForm((f) => ({ ...f, followUpDate: e.target.value }))} />
                <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #fca5a5', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }} placeholder="Note (optional)..." value={outcomeForm.note} onChange={(e) => setOutcomeForm((f) => ({ ...f, note: e.target.value }))} />
                <button onClick={logStructuredOutcome} disabled={submittingOutcome} style={{ width: '100%', padding: '9px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submittingOutcome ? 0.7 : 1 }}>
                  {submittingOutcome ? 'Saving...' : 'Save & Schedule Follow-up'}
                </button>
              </div>
            )}

            {/* LATER */}
            {outcomeMode === 'LATER' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Reason</label>
                  <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #fde68a', fontSize: 13, boxSizing: 'border-box' }} placeholder="e.g. Budget next month, comparing options..." value={outcomeForm.reason} onChange={(e) => setOutcomeForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Follow-up Date</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    {presetFollowUpTimes().map((p) => (
                      <button key={p.label} onClick={() => setOutcomeForm((f) => ({ ...f, followUpDate: p.value }))} style={{ padding: '5px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: outcomeForm.followUpDate === p.value ? '#92400e' : '#fff', color: outcomeForm.followUpDate === p.value ? '#fff' : '#374151', border: `1px solid ${outcomeForm.followUpDate === p.value ? '#92400e' : '#fde68a'}` }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input type="datetime-local" style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #fde68a', fontSize: 13, boxSizing: 'border-box' }} value={outcomeForm.followUpDate} onChange={(e) => setOutcomeForm((f) => ({ ...f, followUpDate: e.target.value }))} />
                </div>
                <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #fde68a', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }} placeholder="Additional note..." value={outcomeForm.note} onChange={(e) => setOutcomeForm((f) => ({ ...f, note: e.target.value }))} />
                <button onClick={logStructuredOutcome} disabled={submittingOutcome || !outcomeForm.followUpDate} style={{ width: '100%', padding: '9px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (submittingOutcome || !outcomeForm.followUpDate) ? 0.7 : 1 }}>
                  {submittingOutcome ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            )}

            {/* NOT INTERESTED */}
            {outcomeMode === 'NOT_INTERESTED' && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Reason</label>
                  <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} placeholder="e.g. Already bought elsewhere, too expensive..." value={outcomeForm.reason} onChange={(e) => setOutcomeForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Objection Type</label>
                  <select style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} value={outcomeForm.objectionType} onChange={(e) => setOutcomeForm((f) => ({ ...f, objectionType: e.target.value }))}>
                    <option value="">Select objection type...</option>
                    <option value="HIGH_PRICE">Price too high</option>
                    <option value="COMPETITOR">Bought from competitor</option>
                    <option value="DELIVERY">Delivery timeline issue</option>
                    <option value="QUALITY">Quality concern</option>
                    <option value="CREDIT">Credit terms not available</option>
                    <option value="NOT_NEEDED">Don't need right now</option>
                    <option value="OTHER">Other reason</option>
                  </select>
                </div>
                <input style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }} placeholder="Note..." value={outcomeForm.note} onChange={(e) => setOutcomeForm((f) => ({ ...f, note: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={logStructuredOutcome} disabled={submittingOutcome} style={{ flex: 1, padding: '9px', background: '#374151', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submittingOutcome ? 0.7 : 1 }}>
                    {submittingOutcome ? 'Saving...' : 'Save Note'}
                  </button>
                  <button onClick={() => handleStatusChange('LOST')} style={{ padding: '9px 14px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Mark Lost
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WHATSAPP CTA — shown after outcome save ── */}
        {waCtaMsg && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', borderBottom: `1px solid #86efac` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💬 Send WhatsApp Message
            </div>
            <pre style={{ margin: '0 0 10px', fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: '#fff', border: '1px solid #86efac', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>
              {waCtaMsg}
            </pre>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waCtaMsg)}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => { if (!waTracked) { trackWaOpen(); setWaTracked(true); } }}
                style={{ flex: 1, display: 'block', textAlign: 'center', padding: '10px', background: '#25D366', color: '#fff', borderRadius: 7, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
              >
                Open WhatsApp{waTracked ? ' ✓' : ''}
              </a>
              <button onClick={() => setWaCtaMsg(null)} style={{ padding: '10px 14px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── OBJECTION ASSIST ── */}
        <div>
          <button
            onClick={() => setObjTopic((v) => (v ? null : 'MENU'))}
            style={{ width: '100%', padding: '9px 16px', textAlign: 'left', background: '#fff', border: 'none', borderTop: `1px solid ${theme.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>🛡 Handle Customer Objections</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{objTopic ? '▲' : '▼'}</span>
          </button>
          {objTopic && (
            <div style={{ padding: '0 16px 12px' }}>
              {[
                { key: 'PRICE',    label: '💰 Price too high',             answer: `Our pricing includes quality materials and GST.\n\nFor bulk orders (50+ units) we can discuss better rates — please search the item above for current pricing.\n\nMinimum approved rate is shown in the product search results.` },
                { key: 'DELIVERY', label: '🚚 Need immediate delivery',     answer: `Trading stock items: 2–3 working days (pan-India delivery).\nManufactured/custom items: 2–3 weeks production + delivery.\n\nWe ship via Shiprocket, Bluedart, and Delhivery. Exact timeline depends on your location.` },
                { key: 'CREDIT',   label: '📋 Requesting credit / advance', answer: `Company policy is advance payment before dispatch.\n\nPayment options:\n• UPI / NEFT / RTGS\n• Cheque (clearance before dispatch)\n• Credit card\n\nRegular customers (3+ orders) can discuss credit terms with the manager.` },
                { key: 'EMI',      label: '💳 EMI request',                 answer: `EMI is available via Razorpay on our website.\n• Minimum order: ₹5,000\n• Banks supported: HDFC, ICICI, Axis, Kotak, SBI\n• Tenures: 3, 6, 9, 12 months\n\nI can share the website payment link for the EMI order.` },
                { key: 'TRUST',    label: '🤝 Trust / first-time buyer',    answer: `Hesh Store has 500+ customers across India — manufacturers, wholesalers, and retailers.\n\nWe can share customer references on request.\nAlso check our Google Reviews and Facebook page.\n\nFeel free to place a small trial order first.` },
                { key: 'DISTANCE', label: '📦 Long-distance delivery',      answer: `We deliver pan-India via Shiprocket, Bluedart, and Delhivery.\n• Most cities: 3–5 working days\n• North-East / remote: 7–10 days\n• Fully tracked shipments\n• Insurance available for high-value orders` },
              ].map(({ key, label, answer }) => (
                <div key={key} style={{ marginTop: 6, borderRadius: 7, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  <button
                    onClick={() => setObjTopic((v) => (v === key ? 'MENU' : key))}
                    style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: objTopic === key ? '#f0f9ff' : '#fafafa', border: 'none', borderBottom: objTopic === key ? '1px solid #bae6fd' : 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>{label}</span>
                    <span>{objTopic === key ? '▲' : '▼'}</span>
                  </button>
                  {objTopic === key && (
                    <pre style={{ margin: 0, padding: '10px 12px', fontSize: 12, color: '#1f2937', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.65, background: '#f8fafc' }}>
                      {answer}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Automation control bar */}
      {!['CONVERTED', 'LOST'].includes(lead.status) && (() => {
        const isSnoozed  = !!lead.automation_snooze_until && new Date(lead.automation_snooze_until) > new Date();
        const isPaused   = Array.isArray(lead.tags) && lead.tags.includes('automation_off');
        const isActive   = !isPaused;
        const MANAGER_ROLES = ['Admin', 'COO', 'Sales Manager'];
        const isManager  = MANAGER_ROLES.includes(currentUser?.role);
        const nextFuLabel = lead.follow_up_date
          ? new Date(lead.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : null;
        const noReplyDays = lead.last_customer_reply_at
          ? Math.floor((Date.now() - new Date(lead.last_customer_reply_at).getTime()) / 86400000)
          : null;
        const snoozeUntilLabel = isSnoozed
          ? new Date(lead.automation_snooze_until).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
          : null;
        const stateBg     = isActive ? '#f0fdf4' : '#fef3c7';
        const stateBorder = isActive ? '#86efac' : '#fcd34d';
        const stateColor  = isActive ? '#15803d' : '#92400e';
        const now = new Date();
        const evening = new Date(now); evening.setHours(19, 0, 0, 0);
        const minsUntilEvening = evening > now ? Math.round((evening - now) / 60000) : null;
        const tmr9 = new Date(now); tmr9.setDate(tmr9.getDate() + 1); tmr9.setHours(9, 0, 0, 0);
        const minsUntilTmr9 = Math.round((tmr9 - now) / 60000);
        return (
          <div style={{ marginBottom: 10, fontSize: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 12px', background: stateBg,
              border: `1px solid ${stateBorder}`,
              borderRadius: showSnoozePanel ? '8px 8px 0 0' : 8,
              flexWrap: 'wrap', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: stateColor }}>
                  {isActive ? '🤖 Active' : isSnoozed ? `⏸ Snoozed until ${snoozeUntilLabel}` : '⏸ Paused'}
                </span>
                {nextFuLabel && (
                  <span style={{ color: '#374151' }}>· Next FU: <strong>{nextFuLabel}</strong></span>
                )}
                {noReplyDays !== null && noReplyDays > 0 && (
                  <span style={{ color: noReplyDays > 3 ? '#b91c1c' : '#92400e' }}>
                    · No reply: <strong>{noReplyDays}d</strong>
                  </span>
                )}
                {lead.assignedUser?.name && (
                  <span style={{ color: '#6b7280' }}>· {lead.assignedUser.name}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {isActive && !isSnoozed && (
                  <button
                    onClick={() => { setShowSnoozePanel((v) => !v); setSnoozeReason(''); }}
                    style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#374151' }}
                  >Snooze</button>
                )}
                {isSnoozed && (
                  <button
                    onClick={() => handlePauseResume(false)}
                    disabled={snoozingAuto}
                    style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #86efac', borderRadius: 5, background: '#fff', color: '#15803d', opacity: snoozingAuto ? 0.6 : 1 }}
                  >{snoozingAuto ? '...' : 'Resume'}</button>
                )}
                {isManager && !isSnoozed && (
                  <button
                    onClick={() => handlePauseResume(isActive)}
                    disabled={snoozingAuto}
                    style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${isPaused ? '#86efac' : '#fca5a5'}`, borderRadius: 5, background: '#fff', color: isPaused ? '#15803d' : '#dc2626', opacity: snoozingAuto ? 0.6 : 1 }}
                  >{snoozingAuto ? '...' : isPaused ? 'Resume' : 'Pause'}</button>
                )}
                <button
                  onClick={() => setTab('activity')}
                  style={{ padding: '3px 9px', fontSize: 11, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#6b7280' }}
                >Log</button>
              </div>
            </div>
            {showSnoozePanel && (
              <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Quick snooze:</span>
                  {[
                    { label: '1 hour', mins: 60 },
                    ...(minsUntilEvening ? [{ label: 'Today 7pm', mins: minsUntilEvening }] : []),
                    { label: 'Tomorrow 9am', mins: minsUntilTmr9 },
                  ].map(({ label, mins }) => (
                    <button
                      key={label}
                      onClick={() => handleSnooze(mins)}
                      disabled={snoozingAuto}
                      style={{ padding: '3px 10px', fontSize: 11, cursor: 'pointer', border: '1px solid #fcd34d', borderRadius: 5, background: '#fff', color: '#92400e', fontWeight: 600 }}
                    >{label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    id="snoozeReasonInput"
                    value={snoozeReason}
                    onChange={(e) => setSnoozeReason(e.target.value)}
                    placeholder="Reason (required) — e.g. Customer requested callback later"
                    style={{ flex: 1, padding: '5px 8px', fontSize: 11, border: `1px solid ${snoozeReason.trim() ? '#fcd34d' : '#fca5a5'}`, borderRadius: 5, outline: 'none' }}
                  />
                  <button
                    onClick={() => { setShowSnoozePanel(false); setSnoozeReason(''); }}
                    style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#6b7280' }}
                  >Cancel</button>
                </div>
                {!snoozeReason.trim() && (
                  <p style={{ fontSize: 10, color: '#dc2626', margin: '4px 0 0' }}>Reason is required before confirming snooze</p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${theme.border}`, marginBottom: 0, flexWrap: 'wrap' }}>
        <button style={tabBtn('timeline')} onClick={() => setTab('timeline')}>Customer Journey</button>
        <button style={tabBtn('notes')} onClick={() => setTab('notes')}>Notes ({notes.filter(n => n.type === 'GENERAL' && !/^Automation (paused|resumed|snoozed)/i.test(n.note || '') && !/whatsapp.*(opened|down|unavailable)/i.test(n.note || '') && !/^Phone not provided/i.test(n.note || '')).length})</button>
        <button style={tabBtn('followups')} onClick={() => setTab('followups')}>Follow-ups ({followups.length})</button>
        <button style={tabBtn('activity')} onClick={() => setTab('activity')}>System Audit</button>
        {lead.whatsapp_chat_id && (
          <button style={tabBtn('chat')} onClick={() => setTab('chat')}>Chat</button>
        )}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16, marginBottom: 16 }}>
        {tab === 'timeline' && (
          <LeadTimeline lead={lead} notes={notes} followups={followups} chatMessages={chatMessages} users={users} />
        )}

        {tab === 'activity' && (
          <ActivityTimeline entityType="lead" entityId={lead.id} maxHeight="500px" />
        )}

        {tab === 'notes' && (() => {
          const LEGACY_SYSTEM_PAT = [
            /^Automation (paused|resumed|snoozed)/i,
            /whatsapp.*opened/i,
            /whatsapp (down|unavailable)/i,
            /^Phone not provided/i,
          ];
          const generalNotes = notes.filter(n =>
            n.type === 'GENERAL' && !LEGACY_SYSTEM_PAT.some(p => p.test(n.note || ''))
          );
          return (
            <>
              <form onSubmit={addNote} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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
              {generalNotes.length === 0 && <p style={{ color: theme.textMuted, fontSize: 13 }}>No notes yet.</p>}
              {generalNotes.map((n) => (
                <div key={n.id} style={{ padding: '10px 12px', borderRadius: 6, background: theme.surface, marginBottom: 8, borderLeft: '3px solid #d1d5db' }}>
                  <p style={{ margin: 0, fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{n.note}</p>
                  <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </>
          );
        })()}

        {tab === 'followups' && (() => {
          const now          = new Date();
          const fmtDue       = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          const fmtRelative  = (d) => {
            const diff = new Date(d) - now;
            const mins = Math.round(diff / 60000);
            if (mins < 0) {
              const ago = Math.abs(mins);
              if (ago < 60)  return `${ago}m overdue`;
              if (ago < 1440) return `${Math.floor(ago / 60)}h overdue`;
              return `${Math.floor(ago / 1440)}d overdue`;
            }
            if (mins < 60)  return `in ${mins}m`;
            if (mins < 1440) return `in ${Math.floor(mins / 60)}h`;
            return `in ${Math.floor(mins / 1440)}d`;
          };

          const overdue   = followups.filter(f => !f.is_completed && new Date(f.due_date) < now);
          const upcoming  = followups.filter(f => !f.is_completed && new Date(f.due_date) >= now);
          const completed = followups.filter(f => f.is_completed);

          const na        = decision?.nextAction;
          const isTerminal = lead.status === 'CONVERTED' || lead.status === 'LOST';
          const isSnoozed  = !!lead.automation_snooze_until && new Date(lead.automation_snooze_until) > now;
          const isPaused   = Array.isArray(lead.tags) && lead.tags.includes('automation_off') && !isSnoozed;
          const lastCall   = [...notes].reverse().find(n => n.type === 'CALL');

          const URGENCY_COLOR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };
          const URGENCY_BG    = { HIGH: '#fff1f2', MEDIUM: '#fffbeb', LOW: '#f0fdf4' };

          const StatusCard = () => {
            if (isTerminal) {
              return (
                <div style={{ background: lead.status === 'CONVERTED' ? '#f0fdf4' : '#fff1f2', border: `1px solid ${lead.status === 'CONVERTED' ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: lead.status === 'CONVERTED' ? '#15803d' : '#dc2626' }}>
                    {lead.status === 'CONVERTED' ? '✅ Lead converted — workflow complete' : '❌ Lead marked as lost — workflow closed'}
                  </div>
                  {lastCall && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                      Last interaction: {lastCall.note?.slice(0, 100)}
                    </div>
                  )}
                </div>
              );
            }
            if (!na || na.action === 'NONE') return null;
            const urgColor = URGENCY_COLOR[na.urgency] || '#374151';
            const urgBg    = URGENCY_BG[na.urgency]    || '#f9fafb';
            return (
              <div style={{ background: urgBg, border: `1.5px solid ${urgColor}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, background: urgColor, color: '#fff', padding: '2px 7px', borderRadius: 99, letterSpacing: 0.5 }}>
                    {na.urgency}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: urgColor }}>{na.label}</span>
                </div>
                {overdue.length > 0 && (
                  <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, marginBottom: 4 }}>
                    ⚠️ {overdue.length} callback{overdue.length > 1 ? 's' : ''} overdue — immediate action required
                  </div>
                )}
                {upcoming.length > 0 && !overdue.length && (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Next callback: <strong>{fmtDue(upcoming[0].due_date)}</strong> ({fmtRelative(upcoming[0].due_date)})
                    {upcoming[0].note && ` — ${upcoming[0].note}`}
                  </div>
                )}
                {!upcoming.length && !overdue.length && (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>No callback scheduled — schedule one below</div>
                )}
              </div>
            );
          };

          const AutomationStatus = () => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: theme.surface, borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
              <span style={{ color: isSnoozed ? '#d97706' : isPaused ? '#dc2626' : '#16a34a', fontSize: 10, fontWeight: 800 }}>
                {isSnoozed ? '💤 SNOOZED' : isPaused ? '⏸ PAUSED' : '⚙️ ACTIVE'}
              </span>
              <span style={{ color: theme.textMuted }}>
                {isSnoozed
                  ? `Automation resumes ${fmtDue(lead.automation_snooze_until)}${lead.automation_snooze_reason ? ` — ${lead.automation_snooze_reason}` : ''}`
                  : isPaused
                  ? 'Automation disabled — manual follow-ups only'
                  : 'Reminders and WA running automatically'}
              </span>
            </div>
          );

          const LastInteraction = () => {
            if (!lastCall) return null;
            return (
              <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderLeft: '3px solid #d97706', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Last call outcome</div>
                <div style={{ fontSize: 12, color: '#1c1917', lineHeight: 1.5 }}>{lastCall.note}</div>
                <div style={{ fontSize: 11, color: '#92400e', marginTop: 3 }}>
                  {new Date(lastCall.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          };

          const CallbackItem = ({ f }) => {
            const isOverdue  = new Date(f.due_date) < now;
            const isManual   = !!f.created_by;
            return (
              <div style={{
                padding: '10px 12px', borderRadius: 6, marginBottom: 6,
                background: isOverdue ? '#fff1f2' : theme.surface,
                borderLeft: `3px solid ${isOverdue ? '#dc2626' : '#d1d5db'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? '#dc2626' : theme.text }}>
                      {fmtDue(f.due_date)}
                    </span>
                    <span style={{ fontSize: 11, color: isOverdue ? '#dc2626' : '#6b7280' }}>({fmtRelative(f.due_date)})</span>
                    {!isManual && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 3 }}>AUTO</span>
                    )}
                    {isOverdue && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: 3 }}>OVERDUE</span>
                    )}
                  </div>
                  {f.note && <p style={{ margin: '3px 0 0', fontSize: 12, color: theme.textMuted }}>{f.note}</p>}
                  {!isManual && (
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                      Complete by logging a call outcome above
                    </p>
                  )}
                </div>
                {isManual && (
                  <button
                    onClick={() => completeFu(f.id)}
                    title="Only use if this was handled outside the call workflow"
                    style={{
                      padding: '3px 10px', background: 'none', border: '1px solid #d1d5db',
                      borderRadius: 5, cursor: 'pointer', fontSize: 11, color: '#6b7280',
                      flexShrink: 0, marginTop: 2,
                    }}
                  >
                    Mark done
                  </button>
                )}
              </div>
            );
          };

          return (
            <div>
              <StatusCard />
              <AutomationStatus />
              <LastInteraction />

              {(overdue.length > 0 || upcoming.length > 0) && (
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Scheduled callbacks ({overdue.length + upcoming.length})
                </div>
              )}
              {[...overdue, ...upcoming].map(f => <CallbackItem key={f.id} f={f} />)}

              {/* Schedule new callback */}
              {!isTerminal && (
                <form onSubmit={addFollowUp} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <input
                    type="datetime-local" style={{ ...inp, width: 195 }}
                    value={newFu.due_date}
                    onChange={(e) => setNewFu((f) => ({ ...f, due_date: e.target.value }))}
                    required
                  />
                  <input
                    style={{ ...inp, flex: 1 }}
                    placeholder="Callback reason (optional)"
                    value={newFu.note}
                    onChange={(e) => setNewFu((f) => ({ ...f, note: e.target.value }))}
                  />
                  <button
                    type="submit" disabled={saving}
                    style={{ padding: '9px 14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    + Schedule
                  </button>
                </form>
              )}

              {completed.length > 0 && (
                <details style={{ marginTop: 14 }}>
                  <summary style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', userSelect: 'none' }}>
                    History ({completed.length})
                  </summary>
                  <div style={{ marginTop: 8 }}>
                    {completed.map(f => (
                      <div key={f.id} style={{ padding: '7px 10px', borderRadius: 5, marginBottom: 4, background: '#f9fafb', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                        <span>{fmtDue(f.due_date)}{f.note ? ` — ${f.note}` : ''}</span>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>✓</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })()}

        {tab === 'chat' && (
          <div>
            <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12, padding: 4 }}>
              {chatMessages.length === 0 && <p style={{ color: theme.textMuted, fontSize: 13 }}>No messages yet.</p>}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', justifyContent: m.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start', marginBottom: 8 }}
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
