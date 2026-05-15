import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const CONSUMPTION_TYPES = ["PCS", "SQFT", "SHEET", "METER", "KG", "LITER"];
const FORMULA_TYPES = [
  { value: "", label: "— None —" },
  { value: "SIMPLE_QTY",       label: "Simple Qty" },
  { value: "SHEET_CALC",       label: "Sheet Calc" },
  { value: "WIDTH_X_LENGTH",   label: "Width × Length" },
  { value: "WEIGHT_BASED",     label: "Weight Based" },
];
const BOQ_STATUSES = [
  { value: "DRAFT",    label: "Draft",    bg: "#fef9c3", color: "#854d0e" },
  { value: "ACTIVE",   label: "Active",   bg: "#dcfce7", color: "#166534" },
  { value: "ARCHIVED", label: "Archived", bg: "#f3f4f6", color: "#6b7280" },
];

const inputStyle = {
  width: "100%", padding: "6px 9px", border: "1px solid #d1d5db",
  borderRadius: 5, fontSize: 12, boxSizing: "border-box",
};
const selectStyle = { ...inputStyle };

const EMPTY_LINE = {
  rawMaterialItemId: "",
  departmentId: "",
  consumptionType: "PCS",
  qtyPerUnit: "",
  wastagePercent: "0",
  width: "",
  height: "",
  sheetSize: "",
  formulaType: "",
  notes: "",
  image: "",
};

function StatusBadge({ status }) {
  const s = BOQ_STATUSES.find((x) => x.value === status) || BOQ_STATUSES[0];
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export default function BoqManager({ itemId, itemName }) {
  const [boqs, setBoqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Raw materials and departments for selects
  const [rawMaterials, setRawMaterials] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Add line state: { [boqId]: form | null }
  const [addLineForms, setAddLineForms] = useState({});
  const [addLineSaving, setAddLineSaving] = useState({});

  // Edit line state: { [`${boqId}-${lineId}`]: form | null }
  const [editLineForms, setEditLineForms] = useState({});
  const [editLineSaving, setEditLineSaving] = useState({});

  const loadBoqs = useCallback(() => {
    setLoading(true);
    apiFetch(`/boq/item/${itemId}`)
      .then((r) => r.json())
      .then(setBoqs)
      .catch(() => toast.error("Failed to load BOQs"))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(() => {
    loadBoqs();
    // Load raw materials (isRawMaterial=true)
    apiFetch("/service-items")
      .then((r) => r.json())
      .then((items) => setRawMaterials(Array.isArray(items) ? items.filter((i) => i.isRawMaterial) : []))
      .catch(() => {});
    // Load departments
    apiFetch("/departments")
      .then((r) => r.json())
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [loadBoqs]);

  const handleCreateBoq = async () => {
    setCreating(true);
    try {
      const res = await apiFetch("/boq", {
        method: "POST",
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed");
      }
      toast.success("BOQ created");
      loadBoqs();
    } catch (err) {
      toast.error(err.message || "Error creating BOQ");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (boqId, newStatus) => {
    try {
      const res = await apiFetch(`/boq/${boqId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Status updated");
      loadBoqs();
    } catch {
      toast.error("Error updating status");
    }
  };

  // Add line helpers
  const openAddLine = (boqId) => {
    setAddLineForms((p) => ({ ...p, [boqId]: { ...EMPTY_LINE } }));
  };
  const cancelAddLine = (boqId) => {
    setAddLineForms((p) => { const n = { ...p }; delete n[boqId]; return n; });
  };

  const handleAddLine = async (e, boqId) => {
    e.preventDefault();
    const f = addLineForms[boqId];
    if (!f.rawMaterialItemId) { toast.error("Raw material is required"); return; }
    if (!f.departmentId)      { toast.error("Department is required");    return; }
    if (!f.qtyPerUnit || Number(f.qtyPerUnit) <= 0) { toast.error("Qty per unit must be > 0"); return; }

    setAddLineSaving((p) => ({ ...p, [boqId]: true }));
    try {
      const res = await apiFetch(`/boq/${boqId}/lines`, {
        method: "POST",
        body: JSON.stringify({
          rawMaterialItemId: Number(f.rawMaterialItemId),
          departmentId:      Number(f.departmentId),
          consumptionType:   f.consumptionType,
          qtyPerUnit:        Number(f.qtyPerUnit),
          wastagePercent:    Number(f.wastagePercent || 0),
          width:             f.width  ? Number(f.width)  : null,
          height:            f.height ? Number(f.height) : null,
          sheetSize:         f.sheetSize    || null,
          formulaType:       f.formulaType  || null,
          notes:             f.notes        || null,
          image:             f.image        || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed");
      }
      toast.success("Line added");
      cancelAddLine(boqId);
      loadBoqs();
    } catch (err) {
      toast.error(err.message || "Error adding line");
    } finally {
      setAddLineSaving((p) => ({ ...p, [boqId]: false }));
    }
  };

  // Edit line helpers
  const openEditLine = (boqId, line) => {
    const key = `${boqId}-${line.id}`;
    setEditLineForms((p) => ({
      ...p,
      [key]: {
        rawMaterialItemId: String(line.rawMaterialItemId ?? ""),
        departmentId:      String(line.departmentId      ?? ""),
        consumptionType:   line.consumptionType   || "PCS",
        qtyPerUnit:        String(line.qtyPerUnit  ?? ""),
        wastagePercent:    String(line.wastagePercent ?? 0),
        width:             line.width  != null ? String(line.width)  : "",
        height:            line.height != null ? String(line.height) : "",
        sheetSize:         line.sheetSize       || "",
        formulaType:       line.formulaType      || "",
        notes:             line.notes            || "",
        image:             line.image            || "",
      },
    }));
  };
  const cancelEditLine = (boqId, lineId) => {
    const key = `${boqId}-${lineId}`;
    setEditLineForms((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const handleEditLine = async (e, boqId, lineId) => {
    e.preventDefault();
    const key = `${boqId}-${lineId}`;
    const f = editLineForms[key];
    if (!f.rawMaterialItemId) { toast.error("Raw material is required"); return; }
    if (!f.departmentId)      { toast.error("Department is required");    return; }
    if (!f.qtyPerUnit || Number(f.qtyPerUnit) <= 0) { toast.error("Qty per unit must be > 0"); return; }

    setEditLineSaving((p) => ({ ...p, [key]: true }));
    try {
      const res = await apiFetch(`/boq/${boqId}/lines/${lineId}`, {
        method: "PATCH",
        body: JSON.stringify({
          rawMaterialItemId: Number(f.rawMaterialItemId),
          departmentId:      Number(f.departmentId),
          consumptionType:   f.consumptionType,
          qtyPerUnit:        Number(f.qtyPerUnit),
          wastagePercent:    Number(f.wastagePercent || 0),
          width:             f.width  ? Number(f.width)  : null,
          height:            f.height ? Number(f.height) : null,
          sheetSize:         f.sheetSize    || null,
          formulaType:       f.formulaType  || null,
          notes:             f.notes        || null,
          image:             f.image        || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed");
      }
      toast.success("Line updated");
      cancelEditLine(boqId, lineId);
      loadBoqs();
    } catch (err) {
      toast.error(err.message || "Error updating line");
    } finally {
      setEditLineSaving((p) => ({ ...p, [key]: false }));
    }
  };

  const handleDeleteLine = async (boqId, lineId) => {
    if (!window.confirm("Delete this line?")) return;
    try {
      const res = await apiFetch(`/boq/${boqId}/lines/${lineId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Line deleted");
      loadBoqs();
    } catch {
      toast.error("Error deleting line");
    }
  };

  const getRawMaterialLabel = (id) => {
    const item = rawMaterials.find((r) => r.id === Number(id));
    return item ? (item.sku || item.itemCode || item.itemName || String(id)) : String(id);
  };
  const getDeptLabel = (id) => {
    const dept = departments.find((d) => d.id === Number(id));
    return dept ? dept.name : String(id);
  };

  const LineForm = ({ form, onChange, onSubmit, onCancel, saving, submitLabel = "Add Line" }) => (
    <form onSubmit={onSubmit} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: 12, marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: "1 1 180px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Raw Material *</div>
          <select value={form.rawMaterialItemId} onChange={(e) => onChange("rawMaterialItemId", e.target.value)} style={selectStyle}>
            <option value="">— Select —</option>
            {rawMaterials.map((r) => (
              <option key={r.id} value={r.id}>{r.sku || r.itemCode} — {r.itemName}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Department *</div>
          <select value={form.departmentId} onChange={(e) => onChange("departmentId", e.target.value)} style={selectStyle}>
            <option value="">— Select —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 100px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Consumption Type *</div>
          <select value={form.consumptionType} onChange={(e) => onChange("consumptionType", e.target.value)} style={selectStyle}>
            {CONSUMPTION_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Qty/Unit *</div>
          <input type="number" min="0.0001" step="any" value={form.qtyPerUnit} onChange={(e) => onChange("qtyPerUnit", e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Wastage %</div>
          <input type="number" min="0" step="any" value={form.wastagePercent} onChange={(e) => onChange("wastagePercent", e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 80px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Width</div>
          <input type="number" min="0" step="any" value={form.width} onChange={(e) => onChange("width", e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 80px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Height</div>
          <input type="number" min="0" step="any" value={form.height} onChange={(e) => onChange("height", e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 100px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Sheet Size</div>
          <input type="text" value={form.sheetSize} onChange={(e) => onChange("sheetSize", e.target.value)} style={inputStyle} placeholder="e.g. 4x8ft" />
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Formula Type</div>
          <select value={form.formulaType} onChange={(e) => onChange("formulaType", e.target.value)} style={selectStyle}>
            {FORMULA_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Notes</div>
          <input type="text" value={form.notes} onChange={(e) => onChange("notes", e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Image URL</div>
          <input type="text" value={form.image} onChange={(e) => onChange("image", e.target.value)} style={inputStyle} placeholder="https://…" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit" disabled={saving}
          style={{ padding: "5px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 12, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button" onClick={onCancel}
          style={{ padding: "5px 14px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  if (loading) return <div style={{ color: "#6b7280", fontSize: 13, padding: 8 }}>Loading BOQ…</div>;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>
        Bill of Quantities — {itemName}
      </div>

      {boqs.length === 0 ? (
        <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: 24, textAlign: "center" }}>
          <div style={{ color: "#6b7280", marginBottom: 12, fontSize: 13 }}>No BOQ created yet.</div>
          <button
            onClick={handleCreateBoq} disabled={creating}
            style={{ padding: "7px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", opacity: creating ? 0.6 : 1 }}
          >
            {creating ? "Creating…" : "Create BOQ"}
          </button>
        </div>
      ) : (
        <div>
          {boqs.map((boq) => {
            const lines = boq.lines || [];
            const addForm = addLineForms[boq.id];

            return (
              <div key={boq.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
                {/* BOQ Header */}
                <div style={{ background: "#f9fafb", padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>BOQ v{boq.version}</span>
                  <StatusBadge status={boq.status} />
                  <select
                    value={boq.status}
                    onChange={(e) => handleStatusChange(boq.id, e.target.value)}
                    style={{ ...selectStyle, width: "auto", fontSize: 11, padding: "3px 8px" }}
                  >
                    {BOQ_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {boq.notes && (
                    <span style={{ fontSize: 12, color: "#6b7280", flex: 1 }}>{boq.notes}</span>
                  )}
                </div>

                {/* Lines table */}
                <div style={{ overflowX: "auto" }}>
                  {lines.length === 0 ? (
                    <div style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af" }}>No lines yet. Add one below.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f3f4f6" }}>
                          {["Raw Material", "Department", "Type", "Qty/Unit", "Wastage %", "Dimensions", "Formula", "Notes", "Actions"].map((h) => (
                            <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap", borderBottom: "1px solid #e5e7eb" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => {
                          const eKey = `${boq.id}-${line.id}`;
                          const isEditing = Boolean(editLineForms[eKey]);
                          const ef = editLineForms[eKey] || {};

                          return (
                            <React.Fragment key={line.id}>
                              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "8px 10px" }}>{getRawMaterialLabel(line.rawMaterialItemId)}</td>
                                <td style={{ padding: "8px 10px" }}>{getDeptLabel(line.departmentId)}</td>
                                <td style={{ padding: "8px 10px" }}>{line.consumptionType}</td>
                                <td style={{ padding: "8px 10px" }}>{line.qtyPerUnit}</td>
                                <td style={{ padding: "8px 10px" }}>{line.wastagePercent ?? 0}%</td>
                                <td style={{ padding: "8px 10px" }}>
                                  {(line.width || line.height)
                                    ? `${line.width ?? "—"} × ${line.height ?? "—"}`
                                    : line.sheetSize || "—"}
                                </td>
                                <td style={{ padding: "8px 10px" }}>{line.formulaType || "—"}</td>
                                <td style={{ padding: "8px 10px" }}>{line.notes || "—"}</td>
                                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                                  <button
                                    onClick={() => isEditing ? cancelEditLine(boq.id, line.id) : openEditLine(boq.id, line)}
                                    style={{ marginRight: 6, padding: "3px 8px", fontSize: 11, border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer" }}
                                  >
                                    {isEditing ? "Cancel" : "Edit"}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLine(boq.id, line.id)}
                                    style={{ padding: "3px 8px", fontSize: 11, border: "1px solid #fca5a5", borderRadius: 4, background: "#fff", color: "#dc2626", cursor: "pointer" }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                              {isEditing && (
                                <tr>
                                  <td colSpan={9} style={{ padding: "4px 10px 10px" }}>
                                    <LineForm
                                      form={ef}
                                      onChange={(k, v) => setEditLineForms((p) => ({ ...p, [eKey]: { ...p[eKey], [k]: v } }))}
                                      onSubmit={(e) => handleEditLine(e, boq.id, line.id)}
                                      onCancel={() => cancelEditLine(boq.id, line.id)}
                                      saving={editLineSaving[eKey]}
                                      submitLabel="Save Changes"
                                    />
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

                {/* Add line */}
                <div style={{ padding: "8px 14px", borderTop: "1px solid #f3f4f6" }}>
                  {!addForm ? (
                    <button
                      onClick={() => openAddLine(boq.id)}
                      style={{ padding: "5px 12px", fontSize: 12, border: "1px solid #2563eb", color: "#2563eb", background: "#fff", borderRadius: 5, cursor: "pointer" }}
                    >
                      + Add Line
                    </button>
                  ) : (
                    <LineForm
                      form={addForm}
                      onChange={(k, v) => setAddLineForms((p) => ({ ...p, [boq.id]: { ...p[boq.id], [k]: v } }))}
                      onSubmit={(e) => handleAddLine(e, boq.id)}
                      onCancel={() => cancelAddLine(boq.id)}
                      saving={addLineSaving[boq.id]}
                      submitLabel="Add Line"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
