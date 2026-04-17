import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './config';
import { theme } from './theme';
import PageLayout from './components/layout/PageLayout';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
});

const EMPTY_FORM = {
  name: '', email: '', mobile: '', role: '',
  marketing_area: '', password: '', can_approve_order: false,
};

const inp = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${theme.border}`, fontSize: 14,
  boxSizing: 'border-box', background: '#fff',
};
const lbl = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: theme.textMuted, marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const ROLE_COLORS = {
  Admin: { bg: '#eff6ff', text: '#1d4ed8' },
  COO: { bg: '#f0fdf4', text: '#15803d' },
  'Sales Manager': { bg: '#fef9c3', text: '#854d0e' },
  default: { bg: '#f1f5f9', text: '#475569' },
};

function roleBadge(role) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.default;
  return (
    <span style={{
      background: c.bg, color: c.text,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 11, fontWeight: 700,
    }}>
      {role || 'No Role'}
    </span>
  );
}

export default function StaffManagement() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        fetch(`${API_URL}/users`, { headers: authHeader() }),
        fetch(`${API_URL}/rbac/roles`, { headers: authHeader() }),
      ]);
      if (staffRes.status === 403) { navigate('/dashboard'); return; }
      const staffData = await staffRes.json();
      const rolesData = await rolesRes.json();
      setStaff(Array.isArray(staffData) ? staffData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({
      name: s.name || '',
      email: s.email || '',
      mobile: s.mobile || '',
      role: s.role || '',
      marketing_area: s.marketing_area || '',
      password: '',
      can_approve_order: !!s.can_approve_order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Name is required'); return; }
    const mobileDigits = (form.mobile || '').replace(/\D/g, '');
    const mobileKey = mobileDigits.length >= 10 ? mobileDigits.slice(-10) : mobileDigits;
    if (!mobileKey || mobileKey.length < 10) {
      alert('Mobile is required (10 digits) — staff sign in with this number');
      return;
    }
    if (!form.role) { alert('Please select a role'); return; }
    if (!editId && !form.password) { alert('Password is required for new staff'); return; }

    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;

      const url = editId ? `${API_URL}/users/${editId}` : `${API_URL}/users`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeader(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        setEditId(null);
        await loadStaff();
      } else {
        const err = await res.json();
        alert(err.message || 'Save failed');
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (s) => {
    const action = s.is_active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${s.name}?`)) return;
    try {
      await fetch(`${API_URL}/users/${s.id}/deactivate`, {
        method: 'PATCH',
        headers: authHeader(),
      });
      await loadStaff();
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  };

  const filtered = staff.filter(s =>
    !search ||
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.mobile || '').replace(/\D/g, '').includes(search.replace(/\D/g, '')) ||
    (s.mobile || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout title="Staff Management">
      <div style={{ padding: '16px 16px 80px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search by name, mobile or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, flex: 1, minWidth: 180 }}
          />
          <button
            onClick={openAdd}
            style={{
              background: theme.primary, color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 18px', fontWeight: 700,
              cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
            }}
          >
            + Add Staff
          </button>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div style={{
            background: '#f8fafc', border: `1px solid ${theme.border}`,
            borderRadius: 12, padding: 16, marginBottom: 20,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: theme.primary }}>
              {editId ? 'Edit Staff Member' : 'Add New Staff Member'}
            </div>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: '0 0 12px' }}>
              Staff sign in with mobile number and password (email is optional).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <input style={inp} placeholder="Full name" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Mobile (login) *</label>
                <input style={inp} type="tel" inputMode="numeric" autoComplete="tel"
                  placeholder="10-digit mobile used to sign in" value={form.mobile}
                  onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Email (optional)</label>
                <input style={inp} type="email" placeholder="Leave blank if not used" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Role *</label>
                <select style={inp} value={form.role}
                  onChange={e => {
                    const r = e.target.value;
                    setForm(f => ({
                      ...f, role: r,
                      can_approve_order: r === 'Admin' || r === 'Sales Manager' || r === 'COO',
                    }));
                  }}
                >
                  <option value="">Select role…</option>
                  {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Marketing Area</label>
                <input style={inp} placeholder="City / Region" value={form.marketing_area}
                  onChange={e => setForm(f => ({ ...f, marketing_area: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>{editId ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input style={inp} type="password" placeholder={editId ? 'Leave blank to keep' : 'Set password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="can_approve"
                checked={form.can_approve_order}
                onChange={e => setForm(f => ({ ...f, can_approve_order: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: theme.primary }}
              />
              <label htmlFor="can_approve" style={{ fontSize: 13, cursor: 'pointer' }}>
                Can approve orders
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={handleSave} disabled={saving} style={{
                background: saving ? '#94a3b8' : theme.primary, color: '#fff',
                border: 'none', borderRadius: 8, padding: '10px 22px',
                fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14,
              }}>
                {saving ? 'Saving…' : editId ? 'Update' : 'Create Staff'}
              </button>
              <button onClick={() => setShowForm(false)} style={{
                background: '#fff', color: theme.textMuted,
                border: `1px solid ${theme.border}`, borderRadius: 8,
                padding: '10px 16px', cursor: 'pointer', fontSize: 14,
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Staff list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: theme.textMuted }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: theme.textMuted }}>
            {search ? 'No staff matching search' : 'No staff members yet. Click + Add Staff to create the first one.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(s => (
              <div key={s.id} style={{
                background: '#fff', border: `1px solid ${theme.border}`,
                borderRadius: 12, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                opacity: s.is_active ? 1 : 0.55,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: theme.primaryLight, color: theme.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16, flexShrink: 0,
                }}>
                  {(s.name || '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span>
                    {roleBadge(s.role)}
                    {!s.is_active && (
                      <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                    <span style={{ fontWeight: 600, color: theme.text }}>Login: </span>
                    {s.mobile || '—'}
                    {s.email ? ` · ${s.email}` : ''}
                    {s.marketing_area ? ` · ${s.marketing_area}` : ''}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(s)} style={{
                    background: theme.primaryLight, color: theme.primary,
                    border: 'none', borderRadius: 6, padding: '6px 12px',
                    cursor: 'pointer', fontWeight: 600, fontSize: 12,
                  }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeactivate(s)} style={{
                    background: s.is_active ? '#fee2e2' : '#f0fdf4',
                    color: s.is_active ? '#dc2626' : '#16a34a',
                    border: 'none', borderRadius: 6, padding: '6px 12px',
                    cursor: 'pointer', fontWeight: 600, fontSize: 12,
                  }}>
                    {s.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!loading && staff.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 12, color: theme.textMuted, textAlign: 'center' }}>
            {staff.filter(s => s.is_active).length} active · {staff.filter(s => !s.is_active).length} inactive · {staff.length} total
          </div>
        )}
      </div>
    </PageLayout>
  );
}
