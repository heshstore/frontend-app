import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './config';
import { theme } from './theme';
import PageLayout from './components/layout/PageLayout';

// ── Permission dependency map (mirrors backend) ──────────────────────────────
const PERMISSION_DEPS = {
  'customer.create':   ['customer.view'],
  'customer.edit':     ['customer.view'],
  'customer.delete':   ['customer.view'],
  'item.create':       ['item.view'],
  'item.edit':         ['item.view'],
  'item.shopify_sync': ['item.view'],
  'quotation.create':  ['quotation.view'],
  'quotation.edit':    ['quotation.view'],
  'quotation.cancel':  ['quotation.view'],
  'quotation.convert': ['quotation.view', 'order.create', 'order.view'],
  'order.create':      ['order.view'],
  'order.edit':        ['order.view'],
  'order.cancel':      ['order.view'],
  'order.approve':     ['order.view'],
  'order.reject':      ['order.view'],
  'invoice.create':    ['invoice.view'],
  'payment.create':    ['payment.view'],
  'dispatch.create':   ['dispatch.view'],
  'production.update': ['production.view'],
  'staff.create':      ['staff.view'],
  'staff.edit':        ['staff.view'],
  'staff.deactivate':  ['staff.view'],
  'rbac.manage':       ['staff.view', 'settings.view'],
};

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });

export default function RbacMatrix() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [matrix, setMatrix] = useState({});        // { [roleId]: Set<permId> }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rbac/matrix`, { headers: authHeader() });
      if (res.status === 403) { navigate('/dashboard'); return; }
      const data = await res.json();
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      const m = {};
      for (const [roleId, permIds] of Object.entries(data.matrix || {})) {
        m[roleId] = new Set(permIds);
      }
      setMatrix(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Group permissions by module ──────────────────────────────────────────
  const grouped = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  // ── Resolve all dependent perm IDs to add when checking a perm ──────────
  const resolveDepsToAdd = (permKey, allPerms) => {
    const deps = PERMISSION_DEPS[permKey] || [];
    const allKeys = new Set([permKey, ...deps]);
    // Also resolve transitively
    let changed = true;
    while (changed) {
      changed = false;
      for (const k of [...allKeys]) {
        for (const dep of (PERMISSION_DEPS[k] || [])) {
          if (!allKeys.has(dep)) { allKeys.add(dep); changed = true; }
        }
      }
    }
    return allPerms.filter(p => allKeys.has(p.key)).map(p => p.id);
  };

  // ── Resolve all dependent perm IDs to remove when unchecking ────────────
  const resolveDepsToRemove = (permKey, allPerms) => {
    // Find all perms that depend on permKey
    const dependents = new Set([permKey]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [key, deps] of Object.entries(PERMISSION_DEPS)) {
        if (deps.some(d => dependents.has(d)) && !dependents.has(key)) {
          dependents.add(key);
          changed = true;
        }
      }
    }
    return allPerms.filter(p => dependents.has(p.key)).map(p => p.id);
  };

  const togglePerm = (roleId, permId, checked) => {
    const perm = permissions.find(p => p.id === permId);
    if (!perm) return;

    setMatrix(prev => {
      const current = new Set(prev[roleId] || []);
      if (checked) {
        const toAdd = resolveDepsToAdd(perm.key, permissions);
        toAdd.forEach(id => current.add(id));
      } else {
        const toRemove = resolveDepsToRemove(perm.key, permissions);
        toRemove.forEach(id => current.delete(id));
      }
      return { ...prev, [roleId]: current };
    });
    setSaved(false);
  };

  const toggleAll = (roleId, checked) => {
    setMatrix(prev => {
      const updated = checked ? new Set(permissions.map(p => p.id)) : new Set();
      return { ...prev, [roleId]: updated };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = Object.entries(matrix).map(([roleId, permSet]) => ({
        roleId: Number(roleId),
        permissionIds: Array.from(permSet),
      }));
      const res = await fetch(`${API_URL}/rbac/matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Save failed');
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const res = await fetch(`${API_URL}/rbac/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      if (res.ok) {
        setNewRoleName('');
        await load();
      } else {
        alert('Failed to add role');
      }
    } finally {
      setAddingRole(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Roles & Permissions">
        <div style={{ padding: 32, textAlign: 'center', color: theme.textMuted }}>Loading matrix…</div>
      </PageLayout>
    );
  }

  const CELL_W = 56;
  const LABEL_W = 200;

  return (
    <PageLayout title="Roles & Permissions">
      <div style={{ padding: '0 0 80px' }}>

        {/* Save bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: '#fff', borderBottom: `1px solid ${theme.border}`,
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ fontSize: 13, color: theme.textMuted }}>
            Check a cell to grant a permission to a role. Dependencies are auto-applied.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>✓ Saved</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving ? '#94a3b8' : theme.primary,
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Add new role */}
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted }}>Add new role:</span>
          <input
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRole()}
            placeholder="Role name…"
            style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 13, width: 180 }}
          />
          <button
            onClick={handleAddRole}
            disabled={addingRole || !newRoleName.trim()}
            style={{
              background: theme.primary, color: '#fff', border: 'none',
              borderRadius: 6, padding: '6px 14px', fontWeight: 600,
              cursor: newRoleName.trim() ? 'pointer' : 'not-allowed',
              opacity: newRoleName.trim() ? 1 : 0.5, fontSize: 13,
            }}
          >
            {addingRole ? 'Adding…' : '+ Add'}
          </button>
        </div>

        {/* Scrollable matrix table */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: LABEL_W + CELL_W * roles.length }}>
            <colgroup>
              <col style={{ width: LABEL_W }} />
              {roles.map(r => <col key={r.id} style={{ width: CELL_W }} />)}
            </colgroup>

            {/* Header row: role names + select-all checkboxes */}
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: '#fff', textAlign: 'left',
                  padding: '10px 12px', fontSize: 12, fontWeight: 700,
                  color: theme.textMuted, textTransform: 'uppercase',
                  borderBottom: `2px solid ${theme.border}`,
                  minWidth: LABEL_W,
                }}>
                  Permission
                </th>
                {roles.map(r => {
                  const allChecked = permissions.length > 0 &&
                    permissions.every(p => matrix[r.id]?.has(p.id));
                  return (
                    <th key={r.id} style={{
                      padding: '6px 4px', fontSize: 11, fontWeight: 700,
                      color: theme.primary, textAlign: 'center',
                      borderBottom: `2px solid ${theme.border}`,
                      verticalAlign: 'bottom',
                    }}>
                      <div style={{
                        writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                        whiteSpace: 'nowrap', lineHeight: 1.2,
                        marginBottom: 6, maxHeight: 120, overflow: 'hidden',
                      }}>
                        {r.name}
                      </div>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={e => toggleAll(r.id, e.target.checked)}
                        title={`Select all for ${r.name}`}
                        style={{ cursor: 'pointer', width: 15, height: 15 }}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {Object.entries(grouped).map(([module, perms]) => (
                <React.Fragment key={module}>
                  {/* Module group header */}
                  <tr>
                    <td
                      colSpan={roles.length + 1}
                      style={{
                        background: theme.primaryLight,
                        color: theme.primary,
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '6px 12px',
                        position: 'sticky', left: 0,
                      }}
                    >
                      {module}
                    </td>
                  </tr>

                  {/* Permission rows */}
                  {perms.map((perm, idx) => (
                    <tr key={perm.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 1,
                        background: 'inherit',
                        padding: '7px 12px',
                        fontSize: 13, color: theme.text,
                        borderBottom: `1px solid ${theme.border}`,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: LABEL_W,
                      }}>
                        {perm.label}
                        {PERMISSION_DEPS[perm.key] && (
                          <span style={{ fontSize: 10, color: theme.textMuted, marginLeft: 4 }}>
                            *
                          </span>
                        )}
                      </td>
                      {roles.map(r => {
                        const checked = !!(matrix[r.id]?.has(perm.id));
                        return (
                          <td key={r.id} style={{
                            textAlign: 'center',
                            borderBottom: `1px solid ${theme.border}`,
                            padding: '4px',
                          }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => togglePerm(r.id, perm.id, e.target.checked)}
                              style={{ cursor: 'pointer', width: 16, height: 16, accentColor: theme.primary }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ padding: '12px 16px', fontSize: 11, color: theme.textMuted }}>
          * Permission has dependencies — checking it will automatically check required permissions. Unchecking a dependency will uncheck all permissions that require it.
        </div>
      </div>
    </PageLayout>
  );
}
