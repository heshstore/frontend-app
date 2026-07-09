import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const inputStyle = {
  width: "100%", padding: "7px 10px", border: "1px solid #d1d5db",
  borderRadius: 6, fontSize: 13, boxSizing: "border-box",
};

const EMPTY_FORM = {
  name: "", code: "", dailyCapacity: "", capacityUnit: "", manpowerCapacity: "", active: true,
};

export default function DepartmentList() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Add form
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);

  // Edit state: { [id]: { ...fields } }
  const [editForms, setEditForms] = useState({});
  const [editSaving, setEditSaving] = useState({});

  const load = () => {
    setLoading(true);
    apiFetch(`/departments${includeInactive ? "?includeInactive=true" : ""}`)
      .then((r) => r.json())
      .then(setDepartments)
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [includeInactive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) { toast.error("Name is required"); return; }
    if (!addForm.code.trim()) { toast.error("Code is required"); return; }
    setAddSaving(true);
    try {
      const res = await apiFetch("/departments", {
        method: "POST",
        body: JSON.stringify({
          ...addForm,
          dailyCapacity:    addForm.dailyCapacity    ? Number(addForm.dailyCapacity)    : null,
          manpowerCapacity: addForm.manpowerCapacity ? Number(addForm.manpowerCapacity) : null,
          capacityUnit:     addForm.capacityUnit     || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed");
      }
      toast.success("Department added");
      setAddForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.message || "Error adding department");
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (dept) => {
    setEditForms((prev) => ({
      ...prev,
      [dept.id]: {
        name:             dept.name             ?? "",
        code:             dept.code             ?? "",
        dailyCapacity:    dept.dailyCapacity     != null ? String(dept.dailyCapacity)    : "",
        capacityUnit:     dept.capacityUnit      ?? "",
        manpowerCapacity: dept.manpowerCapacity  != null ? String(dept.manpowerCapacity) : "",
        active:           dept.active,
      },
    }));
  };

  const cancelEdit = (id) => {
    setEditForms((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleEdit = async (e, id) => {
    e.preventDefault();
    const f = editForms[id];
    if (!f.name.trim()) { toast.error("Name is required"); return; }
    if (!f.code.trim()) { toast.error("Code is required"); return; }
    setEditSaving((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/departments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...f,
          dailyCapacity:    f.dailyCapacity    ? Number(f.dailyCapacity)    : null,
          manpowerCapacity: f.manpowerCapacity ? Number(f.manpowerCapacity) : null,
          capacityUnit:     f.capacityUnit     || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed");
      }
      toast.success("Department updated");
      cancelEdit(id);
      load();
    } catch (err) {
      toast.error(err.message || "Error updating department");
    } finally {
      setEditSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const field = (label, value, onChange, type = "text", placeholder = "") => (
    <div style={{ flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>{label}</div>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} style={inputStyle}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Departments</h2>
        <label style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox" checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {/* Add form */}
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 12 }}>Add Department</div>
        <form onSubmit={handleAdd}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            {field("Name *", addForm.name, (e) => setAddForm((p) => ({ ...p, name: e.target.value })), "text", "e.g. Printing")}
            {field("Code *", addForm.code, (e) => setAddForm((p) => ({ ...p, code: e.target.value })), "text", "e.g. PRINT")}
            {field("Daily Capacity", addForm.dailyCapacity, (e) => setAddForm((p) => ({ ...p, dailyCapacity: e.target.value })), "number", "e.g. 200")}
            {field("Capacity Unit", addForm.capacityUnit, (e) => setAddForm((p) => ({ ...p, capacityUnit: e.target.value })), "text", "e.g. SQFT")}
            {field("Manpower", addForm.manpowerCapacity, (e) => setAddForm((p) => ({ ...p, manpowerCapacity: e.target.value })), "number", "e.g. 5")}
          </div>
          <button
            type="submit" disabled={addSaving}
            style={{
              padding: "7px 18px", background: "#2563eb", color: "#fff",
              border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
              opacity: addSaving ? 0.6 : 1,
            }}
          >
            {addSaving ? "Adding…" : "Add Department"}
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "#6b7280", padding: 16 }}>Loading…</div>
      ) : departments.length === 0 ? (
        <div style={{ color: "#6b7280", padding: 16 }}>No departments found.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["Name", "Code", "Daily Capacity", "Manpower", "Status", "Actions", ""].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => {
              const isEditing = Boolean(editForms[dept.id]);
              const ef = editForms[dept.id] || {};
              return (
                <React.Fragment key={dept.id}>
                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px" }}>{dept.name}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12 }}>{dept.code}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {dept.dailyCapacity != null ? `${dept.dailyCapacity}${dept.capacityUnit ? " " + dept.capacityUnit : ""}` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{dept.manpowerCapacity ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: dept.active ? "#dcfce7" : "#f3f4f6",
                        color: dept.active ? "#166534" : "#6b7280",
                      }}>
                        {dept.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={() => isEditing ? cancelEdit(dept.id) : openEdit(dept)}
                        style={{
                          padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: 5,
                          background: "#fff", fontSize: 12, cursor: "pointer",
                        }}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={() => navigate(`/departments/${dept.id}/control-center`)}
                        style={{
                          padding: "4px 10px", border: "none", borderRadius: 5,
                          background: "#2563eb", color: "#fff", fontSize: 12, cursor: "pointer",
                        }}
                      >
                        Open →
                      </button>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr style={{ background: "#f9fafb" }}>
                      <td colSpan={6} style={{ padding: "12px 16px" }}>
                        <form onSubmit={(e) => handleEdit(e, dept.id)}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                            {field("Name *", ef.name, (e) => setEditForms((p) => ({ ...p, [dept.id]: { ...p[dept.id], name: e.target.value } })))}
                            {field("Code *", ef.code, (e) => setEditForms((p) => ({ ...p, [dept.id]: { ...p[dept.id], code: e.target.value } })))}
                            {field("Daily Capacity", ef.dailyCapacity, (e) => setEditForms((p) => ({ ...p, [dept.id]: { ...p[dept.id], dailyCapacity: e.target.value } })), "number")}
                            {field("Capacity Unit", ef.capacityUnit, (e) => setEditForms((p) => ({ ...p, [dept.id]: { ...p[dept.id], capacityUnit: e.target.value } })))}
                            {field("Manpower", ef.manpowerCapacity, (e) => setEditForms((p) => ({ ...p, [dept.id]: { ...p[dept.id], manpowerCapacity: e.target.value } })), "number")}
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>Active</div>
                              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", paddingTop: 8 }}>
                                <input
                                  type="checkbox" checked={ef.active}
                                  onChange={(e) => setEditForms((p) => ({ ...p, [dept.id]: { ...p[dept.id], active: e.target.checked } }))}
                                />
                                Active
                              </label>
                            </div>
                          </div>
                          <button
                            type="submit" disabled={editSaving[dept.id]}
                            style={{
                              padding: "6px 16px", background: "#2563eb", color: "#fff",
                              border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer",
                              opacity: editSaving[dept.id] ? 0.6 : 1, marginRight: 8,
                            }}
                          >
                            {editSaving[dept.id] ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button" onClick={() => cancelEdit(dept.id)}
                            style={{
                              padding: "6px 16px", background: "#fff", color: "#374151",
                              border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
