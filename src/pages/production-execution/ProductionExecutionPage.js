import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN-READABLE LABELS — factory language, not software terms
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  PENDING:     "Waiting",
  READY:       "Ready to Start",
  WORKING:     "Work Started",
  ON_HOLD:     "On Hold",
  STOPPED:     "Work Done — Pending Handover",
  COMPLETED:   "Completed",
  CANCELLED:   "Cancelled",
  // backwards compat with any pre-migration DB rows
  IN_PROGRESS: "Work Started",
  HOLD:        "On Hold",
};

const STATUS_STYLE = {
  PENDING:     { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
  READY:       { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  WORKING:     { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  ON_HOLD:     { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  STOPPED:     { bg: "#f3e8ff", color: "#7c3aed", border: "#ddd6fe" },
  COMPLETED:   { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  CANCELLED:   { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  IN_PROGRESS: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  HOLD:        { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
};

const PRIORITY_STYLE = {
  LOW:    { bg: "#f8fafc", color: "#64748b" },
  MEDIUM: { bg: "#eff6ff", color: "#1d4ed8" },
  HIGH:   { bg: "#fff7ed", color: "#c2410c" },
  URGENT: { bg: "#fef2f2", color: "#b91c1c" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
      whiteSpace: "nowrap", display: "inline-block",
    }}>
      {STATUS_LABEL[status] ?? status?.replace(/_/g, " ")}
    </span>
  );
}

function PriorityDot({ priority }) {
  const s = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.MEDIUM;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
    }}>
      {priority === "URGENT" ? "⚡ URGENT" : priority}
    </span>
  );
}

// Material readiness from backend (materialSummary.gate) or legacy job status.
function getMaterialBadge(job) {
  const g = job?.materialSummary?.gate;
  if (g === "SHORTAGE") {
    return { label: "Material Shortage", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
  }
  if (g === "PARTIAL") {
    return { label: "Partial Material", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  }
  if (g === "OK") {
    return { label: "Material Ready", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
  }
  if (["COMPLETED", "CANCELLED"].includes(job.status)) return null;
  if (["READY", "WORKING", "ON_HOLD", "STOPPED", "IN_PROGRESS", "HOLD"].includes(job.status)) {
    return { label: "Material Ready", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
  }
  return { label: "Pending Confirm", bg: "#fef9c3", color: "#854d0e", border: "#fde68a" };
}

function MaterialBadge({ job }) {
  const b = getMaterialBadge(job);
  if (!b) return <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>;
  return (
    <span style={{
      background: b.bg, color: b.color, border: `1px solid ${b.border}`,
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
      display: "inline-block",
    }}>
      {b.label}
    </span>
  );
}

function QtyBox({ label, value, highlight, colorOverride }) {
  return (
    <div style={{
      background: highlight ? "#fef2f2" : "#f8fafc",
      borderRadius: 8, padding: "10px 14px", textAlign: "center",
    }}>
      <div style={{ fontSize: 11, color: colorOverride ?? (highlight ? "#b91c1c" : "#64748b"), fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: colorOverride ?? (highlight ? "#b91c1c" : "#0f172a") }}>
        {fmt(value)}
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, variant = "default", disabled = false }) {
  const variants = {
    default: { bg: "#005fb8", color: "#fff" },
    success: { bg: "#15803d", color: "#fff" },
    warning: { bg: "#f59e0b", color: "#fff" },
    danger:  { bg: "#dc2626", color: "#fff" },
    ghost:   { bg: "#f1f5f9", color: "#374151" },
  };
  const v = variants[variant] ?? variants.default;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#e2e8f0" : v.bg,
        color:      disabled ? "#94a3b8" : v.color,
        border: "none", borderRadius: 8,
        padding: "10px 18px", fontSize: 13, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        minHeight: 40, whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT FLOW VISUALIZER
// Shows the full production pipeline with completed / active / waiting states
// ─────────────────────────────────────────────────────────────────────────────

function DepartmentFlow({ stages }) {
  if (!stages?.length) return <span style={{ color: "#94a3b8", fontSize: 13 }}>No departments assigned</span>;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 0, padding: "4px 0" }}>
      {stages.map((s, i) => {
        const isCompleted = s.status === "COMPLETED";
        const isStopped   = s.status === "STOPPED";
        const isActive    = ["READY", "WORKING", "ON_HOLD", "IN_PROGRESS", "HOLD"].includes(s.status);
        const isCancelled = s.status === "CANCELLED";
        const dotBg       = isCompleted ? "#15803d"
                          : isStopped   ? "#7c3aed"
                          : isActive    ? "#005fb8"
                          : isCancelled ? "#b91c1c"
                          : "#e2e8f0";
        const dotColor    = isCompleted || isStopped || isActive || isCancelled ? "#fff" : "#94a3b8";
        const labelColor  = isCompleted ? "#15803d" : isStopped ? "#7c3aed" : isActive ? "#005fb8" : "#94a3b8";
        return (
          <React.Fragment key={s.id}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 70 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: dotBg, color: dotColor,
                fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isActive ? "0 0 0 4px rgba(0,95,184,0.15)" : "none",
                flexShrink: 0,
              }}>
                {isCompleted ? "✓" : isStopped ? "⏹" : i + 1}
              </div>
              <div style={{ fontSize: 10, color: labelColor, fontWeight: (isActive || isStopped) ? 700 : 400, textAlign: "center", lineHeight: 1.25, maxWidth: 66 }}>
                {s.departmentName || `Dept ${i + 1}`}
              </div>
              {(isActive || isStopped) && (
                <div style={{ fontSize: 9, color: STATUS_STYLE[s.status]?.color, fontWeight: 800, textAlign: "center" }}>
                  {STATUS_LABEL[s.status]}
                </div>
              )}
            </div>
            {i < stages.length - 1 && (
              <div style={{
                width: 20, height: 2, alignSelf: "flex-start", marginTop: 14,
                background: isCompleted ? "#15803d" : isStopped ? "#7c3aed" : "#e2e8f0",
                flexShrink: 0,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STOP WORK MODAL — records qty, moves stage to STOPPED (pending handover)
// ─────────────────────────────────────────────────────────────────────────────

function StopWorkModal({ stage, onClose, onDone }) {
  const [completedQty, setCompletedQty] = useState(String(stage.planned_qty ?? stage.plannedQty ?? ""));
  const [rejectedQty,  setRejectedQty]  = useState("0");
  const [remarks,      setRemarks]      = useState("");
  const [wastageRemarks, setWastageRemarks] = useState("");
  const [saving,       setSaving]       = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cq = Number(completedQty);
    const rq = Number(rejectedQty);
    if (!cq || cq <= 0) { toast.error("Completed qty must be greater than 0"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/production/execution/stages/${stage.id}/stop`, {
        method: "PATCH",
        body: JSON.stringify({
          completedQty: cq,
          rejectedQty: rq,
          remarks: remarks || undefined,
          wastageRemarks: wastageRemarks.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to record stop");
      }
      toast.success("Work stopped — tap 'Move Next' to hand off to the next department");
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deptName = stage.departmentName ?? `Department #${stage.department_id ?? stage.departmentId}`;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 28,
        width: 440, maxWidth: "94vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
          Stop Work — {deptName}
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 22 }}>
          Record quantities, then use <strong>Move Next</strong> to hand off to the next department.
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Qty Completed *</div>
            <input
              style={{ width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, fontWeight: 700, boxSizing: "border-box" }}
              type="number" step="0.01" min="0.01"
              value={completedQty} onChange={(e) => setCompletedQty(e.target.value)} autoFocus
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Qty Rejected / Scrap</div>
            <input
              style={{ width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, boxSizing: "border-box" }}
              type="number" step="0.01" min="0"
              value={rejectedQty} onChange={(e) => setRejectedQty(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Wastage / variance notes (optional)</div>
            <input
              style={{ width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              type="text"
              placeholder="e.g. extra trim loss vs BOQ"
              value={wastageRemarks} onChange={(e) => setWastageRemarks(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Remarks / Issues</div>
            <input
              style={{ width: "100%", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              type="text" placeholder="Quality notes, defects, delays… (optional)"
              value={remarks} onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <ActionBtn label="Cancel" variant="ghost" onClick={onClose} />
            <ActionBtn label={saving ? "Saving…" : "⏹ Stop Work"} variant="warning" disabled={saving} onClick={handleSubmit} />
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOLD MODAL — captures reason for hold
// ─────────────────────────────────────────────────────────────────────────────

const HOLD_REASONS = [
  "Machine issue",
  "Material shortage",
  "Operator unavailable",
  "Power issue",
  "Waiting for approval",
  "Quality check",
  "Other",
];

function HoldModal({ stage, onClose, onDone }) {
  const [reason,  setReason]  = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving,  setSaving]  = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toast.error("Please select a reason for the hold"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/production/execution/stages/${stage.id}/hold`, {
        method: "PATCH",
        body: JSON.stringify({ reason, remarks: remarks || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to put on hold");
      }
      toast.success("Work put on hold");
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 28,
        width: 400, maxWidth: "94vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Why are you pausing work?</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
          Select a reason — this helps track downtime.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {HOLD_REASONS.map((r) => (
            <button key={r} onClick={() => setReason(r)} style={{
              padding: "11px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: reason === r ? "2px solid #f59e0b" : "2px solid #e2e8f0",
              background: reason === r ? "#fffbeb" : "#fafafa",
              color: reason === r ? "#92400e" : "#374151",
              cursor: "pointer", textAlign: "left",
            }}>
              {reason === r ? "● " : "○ "}{r}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Additional notes (optional)</div>
          <input
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
            type="text" placeholder="e.g. Machine #3 belt snapped"
            value={remarks} onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <ActionBtn label="Cancel" variant="ghost" onClick={onClose} />
          <ActionBtn label={saving ? "Saving…" : "⏸ Hold Work"} variant="warning" disabled={saving || !reason} onClick={handleSubmit} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL DRAWER — Operational work order view
// Sections: Order Info / Quantities / Department Pipeline / Department Actions
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, bold, blue, mono }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 9 }}>
      <span style={{ fontSize: 12, color: "#64748b", width: 100, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: bold ? 700 : 400,
        color: blue ? "#005fb8" : "#0f172a",
        fontFamily: mono ? "monospace" : undefined,
      }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function JobDetailDrawer({ jobId, onClose, onRefresh }) {
  const [job,      setJob]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [stopping, setStopping] = useState(null);
  const [holding,  setHolding]  = useState(null);

  const load = useCallback(() => {
    if (!jobId) return;
    setLoading(true);
    apiFetch(`/production/execution/jobs/${jobId}`)
      .then((r) => r.json())
      .then(setJob)
      .catch(() => toast.error("Failed to load work order"))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const doStageAction = async (stageId, action, body = {}) => {
    try {
      const res = await apiFetch(`/production/execution/stages/${stageId}/${action}`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Action failed");
      }
      const label = {
        start:      "Work started",
        resume:     "Work resumed",
        "move-next": "Handed off — next department is now ready",
        cancel:     "Stage cancelled",
      }[action] ?? "Done";
      toast.success(label);
      load();
      onRefresh?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const pendingQty = job
    ? Math.max(0, Number(job.qty) - Number(job.completedQty || job.completed_qty || 0))
    : 0;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 900 }} onClick={onClose} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 560, maxWidth: "98vw",
        background: "#fff",
        boxShadow: "-6px 0 32px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
        zIndex: 901,
      }}>
        {/* Drawer header */}
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc", position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button onClick={onClose} style={{
            background: "#e2e8f0", border: "none", borderRadius: 8,
            width: 34, height: 34, fontSize: 16, cursor: "pointer", color: "#374151",
          }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Work Order Detail</div>
            {job && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                {job.orderNo} · {job.customerName}
              </div>
            )}
          </div>
          {job && <StatusBadge status={job.status} />}
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading…</div>
          ) : !job ? (
            <div style={{ textAlign: "center", padding: 60, color: "#dc2626" }}>Work order not found</div>
          ) : (
            <>
              {/* A — Order Information */}
              <Section title="Order Information">
                <InfoRow label="Order No"  value={job.orderNo}      bold blue />
                <InfoRow label="Customer"  value={job.customerName} bold />
                <InfoRow label="Item"      value={job.itemName}     bold />
                <InfoRow label="Item Code" value={job.itemCode}     mono />
                <InfoRow label="Priority"  value={<PriorityDot priority={job.priority} />} />
                <InfoRow label="Material"  value={<MaterialBadge job={job} />} />
              </Section>

              {/* B — Quantity Summary */}
              <Section title="Quantities">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <QtyBox label="Ordered"   value={job.qty} />
                  <QtyBox label="Completed" value={job.completedQty || job.completed_qty} colorOverride="#15803d" />
                  <QtyBox label="Pending"   value={pendingQty} colorOverride={pendingQty > 0 ? "#92400e" : undefined} />
                  <QtyBox label="Rejected"  value={job.rejectedQty || job.rejected_qty}  highlight />
                </div>
              </Section>

              {/* Materials & FG (from ledger-backed reservations) */}
              {job.materialSummary && (
                <Section title="Materials & FG">
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                    <strong>FG produced (job):</strong>{" "}
                    {fmt(job.materialSummary.fgProducedQty ?? 0)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 6 }}>A — Reserved</div>
                  <div style={{ fontSize: 12, marginBottom: 14, maxHeight: 140, overflowY: "auto" }}>
                    {(job.materialSummary.reservations ?? []).length === 0 ? (
                      <span style={{ color: "#94a3b8" }}>No reservations yet (start first department to reserve).</span>
                    ) : (
                      (job.materialSummary.reservations ?? []).map((r) => (
                        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{ flex: 1, minWidth: 0 }}>{r.rawItemName}</span>
                          <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>{r.warehouseName}</span>
                          <span style={{ fontWeight: 700 }}>{fmt(r.reserved_qty)} / req {fmt(r.required_qty)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 6 }}>B — Consumed (by raw)</div>
                  <div style={{ fontSize: 12, marginBottom: 14 }}>
                    {(job.materialSummary.byRaw ?? []).map((r) => (
                      <div key={r.rawMaterialItemId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <span>{r.rawItemName}</span>
                        <span style={{ fontWeight: 700 }}>{fmt(r.consumedQty)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 6 }}>C — Remaining vs plan</div>
                  <div style={{ fontSize: 12, marginBottom: 8 }}>
                    {(job.materialSummary.byRaw ?? []).map((r) => (
                      <div key={`rem-${r.rawMaterialItemId}`} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <span>{r.rawItemName}</span>
                        <span style={{ fontWeight: 700, color: r.remainingQty > 0 ? "#92400e" : "#15803d" }}>{fmt(r.remainingQty)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 4 }}>D — FG qty</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>{fmt(job.materialSummary.fgProducedQty ?? 0)} units recorded on job</div>
                </Section>
              )}

              {/* Department Workflow visual */}
              <Section title="Department Workflow">
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 20px" }}>
                  <DepartmentFlow stages={job.stages ?? []} />
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                  {(job.stages ?? []).filter(s => s.status === "COMPLETED").length} of {(job.stages ?? []).length} departments completed
                </div>
              </Section>

              {/* D — Department Actions */}
              <Section title="Department Work">
                {(job.stages ?? []).length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>No departments assigned yet.</div>
                ) : (
                  (job.stages ?? []).map((stage, idx) => {
                    const isActive    = ["READY", "WORKING", "ON_HOLD", "IN_PROGRESS", "HOLD"].includes(stage.status);
                    const isStopped   = stage.status === "STOPPED";
                    const isCompleted = stage.status === "COMPLETED";
                    const isCancelled = stage.status === "CANCELLED";
                    return (
                      <div key={stage.id} style={{
                        border: `2px solid ${isStopped ? "#ddd6fe" : isActive ? "#005fb8" : isCompleted ? "#bbf7d0" : isCancelled ? "#fecaca" : "#e2e8f0"}`,
                        borderRadius: 10, padding: "14px 16px", marginBottom: 10,
                        background: isStopped ? "#faf5ff" : isActive ? "#f0f7ff" : isCompleted ? "#f9fffe" : "#fafafa",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                            background: isCompleted ? "#15803d" : isStopped ? "#7c3aed" : isActive ? "#005fb8" : isCancelled ? "#b91c1c" : "#e2e8f0",
                            color: (isCompleted || isStopped || isActive || isCancelled) ? "#fff" : "#94a3b8",
                            fontSize: 11, fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {isCompleted ? "✓" : isStopped ? "⏹" : idx + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                              {stage.departmentName || `Department ${idx + 1}`}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              Planned: {fmt(stage.planned_qty)} units
                              {Number(stage.completed_qty) > 0 && ` · Done: ${fmt(stage.completed_qty)}`}
                              {Number(stage.rejected_qty)  > 0 && ` · Rejected: ${fmt(stage.rejected_qty)}`}
                            </div>
                            {(stage.operatorName || stage.movedByName) && (
                              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                                {stage.operatorName && <>Operator: <b>{stage.operatorName}</b></>}
                                {stage.movedByName && <> · Moved by: <b>{stage.movedByName}</b></>}
                              </div>
                            )}
                          </div>
                          <StatusBadge status={stage.status} />
                        </div>

                        {stage.wastage_remarks && (
                          <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", padding: "6px 10px", borderRadius: 6, marginBottom: 10 }}>
                            Wastage note: {stage.wastage_remarks}
                          </div>
                        )}

                        {stage.remarks && (
                          <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", padding: "6px 10px", borderRadius: 6, marginBottom: 10 }}>
                            Note: {stage.remarks}
                          </div>
                        )}

                        {stage.started_at && (
                          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
                            Started: {fmtDate(stage.started_at)}
                            {stage.stopped_at && ` · Stopped: ${fmtDate(stage.stopped_at)}`}
                            {stage.completed_at && ` · Handed off: ${fmtDate(stage.completed_at)}`}
                          </div>
                        )}

                        {stage.hold_reason && (
                          <div style={{ fontSize: 12, color: "#c2410c", background: "#fff7ed", padding: "5px 10px", borderRadius: 6, marginBottom: 10 }}>
                            Hold reason: {stage.hold_reason}
                          </div>
                        )}

                        {!["COMPLETED", "CANCELLED"].includes(stage.status) && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                            {stage.status === "READY" && (
                              <ActionBtn
                                label="▶ Start Work"
                                variant="default"
                                disabled={job.materialSummary?.gate === "SHORTAGE"}
                                onClick={() => doStageAction(stage.id, "start")}
                              />
                            )}
                            {(stage.status === "WORKING" || stage.status === "IN_PROGRESS") && (
                              <>
                                <ActionBtn label="⏹ Stop Work"  variant="warning" onClick={() => setStopping(stage)} />
                                <ActionBtn label="⏸ Hold Work"  variant="ghost"   onClick={() => setHolding(stage)} />
                              </>
                            )}
                            {(stage.status === "ON_HOLD" || stage.status === "HOLD") && (
                              <ActionBtn label="▶ Resume Work" variant="default" onClick={() => doStageAction(stage.id, "resume")} />
                            )}
                            {stage.status === "STOPPED" && (
                              <ActionBtn label="➡ Move Next" variant="success" onClick={() => doStageAction(stage.id, "move-next")} />
                            )}
                            <ActionBtn label="Cancel" variant="ghost" onClick={() => {
                              if (window.confirm(`Cancel ${stage.departmentName || "this department"} stage?`)) {
                                doStageAction(stage.id, "cancel");
                              }
                            }} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </Section>
            </>
          )}
        </div>
      </div>

      {stopping && (
        <StopWorkModal
          stage={stopping}
          onClose={() => setStopping(null)}
          onDone={() => { setStopping(null); load(); onRefresh?.(); }}
        />
      )}
      {holding && (
        <HoldModal
          stage={holding}
          onClose={() => setHolding(null)}
          onDone={() => { setHolding(null); load(); onRefresh?.(); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOARD JOB CARD — compact card for the department kanban columns
// ─────────────────────────────────────────────────────────────────────────────

function BoardJobCard({ stage, onAction, onStop, onHold, onOpen }) {
  const isWorking = stage.status === "WORKING" || stage.status === "IN_PROGRESS";
  const isHold    = stage.status === "ON_HOLD"  || stage.status === "HOLD";
  const isStopped = stage.status === "STOPPED";
  const isReady   = stage.status === "READY";

  const now          = Date.now();
  const elapsedMin   = stage.started_at ? (now - new Date(stage.started_at).getTime()) / 60000 : 0;
  const holdMin      = Number(stage.total_hold_minutes || 0);
  const activeHoldMin = (isHold && stage.hold_started_at)
    ? (now - new Date(stage.hold_started_at).getTime()) / 60000 : 0;
  const totalHoldMin = holdMin + activeHoldMin;
  const workingMin   = Math.max(0, elapsedMin - totalHoldMin);

  function fmtMin(m) {
    if (!m || m < 1) return null;
    const h = Math.floor(m / 60);
    const mm = Math.round(m % 60);
    return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
  }

  const borderColor = isStopped ? "#ddd6fe" : isWorking ? "#005fb8" : isHold ? "#f59e0b" : "#bfdbfe";
  const bgColor     = isStopped ? "#faf5ff" : isWorking ? "#f0f7ff" : isHold ? "#fffbeb" : "#fff";

  return (
    <div style={{ background: bgColor, borderRadius: 10, border: `2px solid ${borderColor}`, padding: "12px 14px" }}>
      {/* Item / order / customer */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}>
            {stage.itemName || "—"}
          </div>
          <div style={{ fontSize: 11, color: "#005fb8", fontWeight: 700 }}>{stage.orderNo}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{stage.customerName || "—"}</div>
        </div>
        <PriorityDot priority={stage.jobPriority} />
      </div>

      {/* Status + Qty row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <StatusBadge status={stage.status} />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Qty</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{fmt(stage.planned_qty)}</div>
          </div>
          {Number(stage.completed_qty) > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#15803d", fontWeight: 700, textTransform: "uppercase" }}>Done</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#15803d" }}>{fmt(stage.completed_qty)}</div>
            </div>
          )}
          {Number(stage.rejected_qty) > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#b91c1c", fontWeight: 700, textTransform: "uppercase" }}>Rej</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#b91c1c" }}>{fmt(stage.rejected_qty)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Material gate (READY queue only) */}
      {isReady && stage.material_gate && (
        <div style={{ marginBottom: 8 }}>
          {stage.material_gate === "OK" && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
              Material Ready
            </span>
          )}
          {stage.material_gate === "PARTIAL" && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>
              Partial Material
            </span>
          )}
          {stage.material_gate === "SHORTAGE" && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              Material Shortage
            </span>
          )}
        </div>
      )}

      {/* Timer strip */}
      {stage.started_at && (fmtMin(workingMin) || fmtMin(totalHoldMin)) && (
        <div style={{
          background: "rgba(0,0,0,0.04)", borderRadius: 7,
          padding: "5px 10px", marginBottom: 8,
          display: "flex", gap: 12, flexWrap: "wrap",
        }}>
          {fmtMin(workingMin) && (
            <span style={{ fontSize: 11, color: isHold ? "#94a3b8" : "#374151", fontWeight: 600 }}>
              ⏱ {fmtMin(workingMin)}
            </span>
          )}
          {fmtMin(totalHoldMin) && (
            <span style={{ fontSize: 11, color: "#c2410c", fontWeight: 600 }}>
              ⏸ {fmtMin(totalHoldMin)} hold
            </span>
          )}
          {isStopped && Number(stage.actual_working_minutes) > 0 && (
            <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
              ✓ {fmtMin(Number(stage.actual_working_minutes))} actual
            </span>
          )}
        </div>
      )}

      {/* Hold reason */}
      {stage.hold_reason && (
        <div style={{ fontSize: 11, color: "#c2410c", background: "#fff7ed", padding: "4px 8px", borderRadius: 6, marginBottom: 8 }}>
          Hold: {stage.hold_reason}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {isReady   && <ActionBtn label="▶ Start"      variant="default"  disabled={stage.material_gate === "SHORTAGE"} onClick={() => onAction(stage.id, "start")} />}
        {isWorking && <ActionBtn label="⏹ Stop"       variant="warning"  onClick={() => onStop(stage)} />}
        {isWorking && <ActionBtn label="⏸ Hold"       variant="ghost"    onClick={() => onHold(stage)} />}
        {isHold    && <ActionBtn label="▶ Resume"     variant="default"  onClick={() => onAction(stage.id, "resume")} />}
        {isStopped && <ActionBtn label="➡ Move Next"  variant="success"  onClick={() => onAction(stage.id, "move-next")} />}
        <button
          onClick={() => onOpen(stage.jobId ?? stage.job_id)}
          style={{
            background: "none", border: "1px solid #e2e8f0", borderRadius: 6,
            padding: "6px 10px", fontSize: 11, color: "#64748b",
            cursor: "pointer", marginLeft: "auto",
          }}
        >
          Details
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 0 — BOARD VIEW (kanban by department)
// ─────────────────────────────────────────────────────────────────────────────

const BOARD_SEL = {
  padding: "8px 12px", border: "1px solid #d1d5db",
  borderRadius: 8, fontSize: 12, background: "#fff", color: "#374151",
};

function BoardViewTab() {
  const [departments,  setDepartments]  = useState([]);
  const [deptQueues,   setDeptQueues]   = useState({});
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingQ,     setLoadingQ]     = useState(false);
  const [stopping,     setStopping]     = useState(null);
  const [holding,      setHolding]      = useState(null);
  const [selectedJob,  setSelectedJob]  = useState(null);
  const [fDept,        setFDept]        = useState("");
  const [fStatus,      setFStatus]      = useState("");
  const [fPriority,    setFPriority]    = useState("");
  const [fMatReady,    setFMatReady]    = useState(false);
  const [fDelayed,     setFDelayed]     = useState(false);

  useEffect(() => {
    setLoadingDepts(true);
    apiFetch("/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : (d?.data ?? [])))
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoadingDepts(false));
  }, []);

  const loadQueues = useCallback(async () => {
    if (departments.length === 0) return;
    setLoadingQ(true);
    try {
      const results = await Promise.all(
        departments.map((dept) =>
          apiFetch(`/production/execution/department/${dept.id}/queue`)
            .then((r) => r.json())
            .then((data) => ({ id: dept.id, stages: Array.isArray(data) ? data : [] }))
            .catch(() => ({ id: dept.id, stages: [] }))
        )
      );
      const map = {};
      for (const r of results) map[r.id] = r.stages;
      setDeptQueues(map);
    } finally {
      setLoadingQ(false);
    }
  }, [departments]);

  useEffect(() => { loadQueues(); }, [loadQueues]);

  const doAction = async (stageId, action, body = {}) => {
    try {
      const res = await apiFetch(`/production/execution/stages/${stageId}/${action}`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Action failed");
      }
      const labels = {
        start:       "Work started",
        resume:      "Work resumed",
        "move-next": "Handed off — next department is now ready",
      };
      toast.success(labels[action] ?? "Done");
      loadQueues();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const passesFilter = (stage) => {
    if (fStatus && stage.status !== fStatus) return false;
    if (fPriority && stage.jobPriority !== fPriority) return false;
    if (fMatReady) {
      if (stage.status !== "READY") return false;
      if (stage.material_gate === "SHORTAGE") return false;
    }
    if (fDelayed) {
      if (!stage.started_at) return false;
      if ((Date.now() - new Date(stage.started_at).getTime()) < 8 * 3_600_000) return false;
    }
    return true;
  };

  const visibleDepts = fDept
    ? departments.filter((d) => String(d.id) === fDept)
    : departments;

  const hasFilter = fDept || fStatus || fPriority || fMatReady || fDelayed;

  if (loadingDepts) {
    return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading departments…</div>;
  }

  if (departments.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60, background: "#f8fafc", borderRadius: 14, border: "1px dashed #e2e8f0" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#374151" }}>No departments configured</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
          Add departments first to see the production board.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <select style={BOARD_SEL} value={fDept} onChange={(e) => setFDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
        <select style={BOARD_SEL} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="READY">Ready to Start</option>
          <option value="WORKING">Working</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="STOPPED">Pending Handover</option>
        </select>
        <select style={BOARD_SEL} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="URGENT">⚡ Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Normal</option>
          <option value="LOW">Low</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={fMatReady} onChange={(e) => setFMatReady(e.target.checked)} />
          Can start (material OK)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={fDelayed} onChange={(e) => setFDelayed(e.target.checked)} />
          Delayed (8h+)
        </label>
        {hasFilter && (
          <button
            onClick={() => { setFDept(""); setFStatus(""); setFPriority(""); setFMatReady(false); setFDelayed(false); }}
            style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
          >
            Clear Filters
          </button>
        )}
        <button
          onClick={loadQueues}
          disabled={loadingQ}
          style={{
            background: "#005fb8", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700,
            cursor: loadingQ ? "not-allowed" : "pointer",
            opacity: loadingQ ? 0.7 : 1, marginLeft: "auto",
          }}
        >
          {loadingQ ? "Refreshing…" : "Refresh Board"}
        </button>
      </div>

      {/* Kanban columns */}
      <div style={{ display: "flex", gap: 14, overflowX: "auto", alignItems: "flex-start", paddingBottom: 16 }}>
        {visibleDepts.map((dept) => {
          const stages  = (deptQueues[dept.id] ?? []).filter(passesFilter);
          const working = stages.filter((s) => ["WORKING","IN_PROGRESS"].includes(s.status)).length;
          const onHold  = stages.filter((s) => ["ON_HOLD","HOLD"].includes(s.status)).length;
          const stopped = stages.filter((s) => s.status === "STOPPED").length;
          const ready   = stages.filter((s) => s.status === "READY").length;

          return (
            <div key={dept.id} style={{
              minWidth: 292, maxWidth: 320, flexShrink: 0,
              background: "#f8fafc", borderRadius: 12,
              border: "1px solid #e2e8f0",
              display: "flex", flexDirection: "column",
            }}>
              {/* Column header */}
              <div style={{
                padding: "14px 16px 10px",
                background: "#fff",
                borderBottom: "2px solid #e2e8f0",
                borderRadius: "12px 12px 0 0",
              }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 8 }}>
                  🏭 {dept.name}
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {working > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#fef3c7", color: "#92400e" }}>
                      {working} Working
                    </span>
                  )}
                  {onHold > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#fff7ed", color: "#c2410c" }}>
                      {onHold} On Hold
                    </span>
                  )}
                  {stopped > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#f3e8ff", color: "#7c3aed" }}>
                      {stopped} Handover
                    </span>
                  )}
                  {ready > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#eff6ff", color: "#1d4ed8" }}>
                      {ready} Ready
                    </span>
                  )}
                  {stages.length === 0 && (
                    <span style={{ fontSize: 10, color: "#15803d", fontWeight: 600 }}>✓ Clear</span>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div style={{
                padding: "10px",
                maxHeight: 680, overflowY: "auto",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                {loadingQ && (deptQueues[dept.id] === undefined) ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 12 }}>
                    Loading…
                  </div>
                ) : stages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px 0", color: "#94a3b8", fontSize: 12 }}>
                    No active work
                  </div>
                ) : (
                  stages.map((stage) => (
                    <BoardJobCard
                      key={stage.id}
                      stage={stage}
                      onAction={doAction}
                      onStop={setStopping}
                      onHold={setHolding}
                      onOpen={setSelectedJob}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {stopping && (
        <StopWorkModal
          stage={stopping}
          onClose={() => setStopping(null)}
          onDone={() => { setStopping(null); loadQueues(); }}
        />
      )}
      {holding && (
        <HoldModal
          stage={holding}
          onClose={() => setHolding(null)}
          onDone={() => { setHolding(null); loadQueues(); }}
        />
      )}
      {selectedJob && (
        <JobDetailDrawer
          jobId={selectedJob}
          onClose={() => setSelectedJob(null)}
          onRefresh={loadQueues}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — WORK ORDERS (main production board)
// ─────────────────────────────────────────────────────────────────────────────

function WorkOrdersTab() {
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [fStatus,  setFStatus]  = useState("");
  const [fPri,     setFPri]     = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (fStatus) p.set("status",   fStatus);
    if (fPri)    p.set("priority", fPri);
    apiFetch(`/production/execution/jobs?${p}`)
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load work orders"))
      .finally(() => setLoading(false));
  }, [fStatus, fPri]);

  useEffect(() => { load(); }, [load]);

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (j.itemName     ?? "").toLowerCase().includes(q) ||
      (j.orderNo      ?? "").toLowerCase().includes(q) ||
      (j.customerName ?? "").toLowerCase().includes(q)
    );
  });

  // Summary strip counts
  const counts = {
    total:   filtered.length,
    working: filtered.filter(j => ["WORKING", "IN_PROGRESS"].includes(j.status)).length,
    ready:   filtered.filter(j => j.status === "READY").length,
    waiting: filtered.filter(j => j.status === "PENDING").length,
    onHold:  filtered.filter(j => ["ON_HOLD", "HOLD"].includes(j.status)).length,
    stopped: filtered.filter(j => j.status === "STOPPED").length,
  };

  return (
    <div>
      {/* Summary strip */}
      {!loading && jobs.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Orders",        val: counts.total,   bg: "#f8fafc",  color: "#374151" },
            { label: "Work Started",        val: counts.working, bg: "#fef3c7",  color: "#92400e" },
            { label: "Ready to Start",      val: counts.ready,   bg: "#eff6ff",  color: "#1d4ed8" },
            { label: "Waiting",             val: counts.waiting, bg: "#f8fafc",  color: "#64748b" },
            { label: "On Hold",             val: counts.onHold,  bg: "#fff7ed",  color: "#c2410c" },
            { label: "Pending Handover",    val: counts.stopped, bg: "#f3e8ff",  color: "#7c3aed" },
          ].filter(s => s.val > 0 || s.label === "Total Orders").map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 9, padding: "8px 16px",
              display: "flex", gap: 8, alignItems: "baseline",
              border: "1px solid rgba(0,0,0,0.05)",
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</span>
              <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input
          style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, minWidth: 240, boxSizing: "border-box" }}
          placeholder="Search order, customer or item…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}
          value={fStatus} onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="">All Work Statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}
          value={fPri} onChange={(e) => setFPri(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="URGENT">⚡ Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Normal</option>
          <option value="LOW">Low</option>
        </select>
        {(search || fStatus || fPri) && (
          <button
            onClick={() => { setSearch(""); setFStatus(""); setFPri(""); }}
            style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}
          >
            Clear Filters
          </button>
        )}
        <button
          onClick={load}
          style={{ background: "#005fb8", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginLeft: "auto" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading work orders…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#f8fafc", borderRadius: 14, border: "1px dashed #e2e8f0" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏭</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#374151", marginBottom: 6 }}>No production work orders yet</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            Work orders are created automatically when a manufacturing order with an active BOQ is approved.
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
            {filtered.length} work order{filtered.length !== 1 ? "s" : ""}
          </div>
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "Order No", "Customer", "Item",
                    "Current Department", "Ordered", "Completed", "Pending", "Rejected",
                    "Material", "Work Status", "",
                  ].map((h, i) => (
                    <th key={i} style={{
                      padding: "11px 14px",
                      textAlign: (i >= 4 && i <= 7) ? "center" : "left",
                      fontWeight: 700, color: "#475569", fontSize: 11,
                      borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap",
                      letterSpacing: 0.3,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  const pendingQty = Math.max(0, Number(job.qty) - Number(job.completedQty || 0));
                  const isUrgent   = job.priority === "URGENT";
                  const rowBg      = isUrgent ? "#fff9f9" : undefined;
                  return (
                    <tr key={job.id} style={{
                      background: rowBg,
                      borderLeft: isUrgent ? "3px solid #dc2626" : "3px solid transparent",
                    }}>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontWeight: 700, color: "#005fb8", fontSize: 13 }}>{job.orderNo || "—"}</div>
                        {isUrgent && <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 800 }}>⚡ URGENT</div>}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", maxWidth: 130 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{job.customerName || "—"}</div>
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", maxWidth: 180 }}>
                        <div style={{ fontWeight: 600 }}>{job.itemName || "—"}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{job.itemCode}</div>
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", minWidth: 140 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#374151" }}>
                          {job.currentDeptName || <span style={{ color: "#cbd5e1" }}>—</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                          {job.completedStages ?? 0} / {job.totalStages ?? 0} depts done
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center", fontWeight: 800, fontSize: 14 }}>
                        {fmt(job.qty)}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center", fontWeight: 800, fontSize: 14, color: "#15803d" }}>
                        {fmt(job.completedQty || 0)}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center", fontWeight: 800, fontSize: 14, color: pendingQty > 0 ? "#92400e" : "#94a3b8" }}>
                        {fmt(pendingQty)}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center", fontWeight: 800, fontSize: 14, color: Number(job.rejectedQty || 0) > 0 ? "#b91c1c" : "#94a3b8" }}>
                        {fmt(job.rejectedQty || 0)}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                        <MaterialBadge job={job} />
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                        <StatusBadge status={job.status} />
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                        <button
                          onClick={() => setSelected(job.id)}
                          style={{
                            background: "#005fb8", color: "#fff",
                            border: "none", borderRadius: 7,
                            padding: "8px 16px", fontSize: 12, fontWeight: 700,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && (
        <JobDetailDrawer jobId={selected} onClose={() => setSelected(null)} onRefresh={load} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — MY WORK (stages assigned to the current user)
// ─────────────────────────────────────────────────────────────────────────────

function MyWorkTab() {
  const [stages,  setStages]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(null);
  const [holding,  setHolding]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/production/execution/my-stages")
      .then((r) => r.json())
      .then((d) => setStages(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load your work"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (stageId, action, body = {}) => {
    try {
      const res = await apiFetch(`/production/execution/stages/${stageId}/${action}`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Action failed");
      }
      const labels = {
        start:       "Work started",
        resume:      "Work resumed",
        "move-next": "Handed off — next department is now ready",
      };
      toast.success(labels[action] ?? "Done");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={load}
          style={{ background: "#005fb8", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading your work…</div>
      ) : stages.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#f0fdf4", borderRadius: 14, border: "1px dashed #bbf7d0" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#15803d" }}>All caught up!</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>No work currently assigned to you.</div>
        </div>
      ) : (
        stages.map((stage) => {
          const isWorking = stage.status === "WORKING" || stage.status === "IN_PROGRESS";
          const isHold    = stage.status === "ON_HOLD"  || stage.status === "HOLD";
          const isStopped = stage.status === "STOPPED";
          const isReady   = stage.status === "READY";
          return (
            <div key={stage.id} style={{
              borderRadius: 12, marginBottom: 14,
              border: `2px solid ${isWorking ? "#005fb8" : isHold ? "#f59e0b" : isStopped ? "#ddd6fe" : "#e2e8f0"}`,
              background: isWorking ? "#f0f7ff" : isHold ? "#fffbeb" : isStopped ? "#faf5ff" : "#fff",
              padding: "18px 20px",
            }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 2 }}>
                    {stage.itemName || "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "#005fb8", fontWeight: 700 }}>{stage.orderNo}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Customer: {stage.customerName || "—"}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <StatusBadge status={stage.status} />
                  <PriorityDot priority={stage.jobPriority} />
                </div>
              </div>

              {/* Your department */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  Your Department
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
                  {stage.departmentName || `Department #${stage.department_id}`}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  Step {stage.sequence_no} of the production workflow
                </div>
              </div>

              {stage.hold_reason && (
                <div style={{ fontSize: 12, color: "#c2410c", background: "#fff7ed", padding: "6px 12px", borderRadius: 7, marginBottom: 14 }}>
                  Hold reason: {stage.hold_reason}
                </div>
              )}

              {isStopped && (
                <div style={{ fontSize: 12, color: "#7c3aed", background: "#f3e8ff", padding: "6px 12px", borderRadius: 7, marginBottom: 14 }}>
                  Work recorded — tap Move Next to hand off to the next department.
                </div>
              )}

              {/* Qty */}
              <div style={{ display: "grid", gridTemplateColumns: Number(stage.completed_qty) > 0 ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 16 }}>
                <QtyBox label="Qty to Process" value={stage.planned_qty} />
                {Number(stage.completed_qty) > 0 && (
                  <QtyBox label="Completed" value={stage.completed_qty} colorOverride="#15803d" />
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {isReady   && <ActionBtn label="▶  Start Work"   variant="default"  disabled={stage.material_gate === "SHORTAGE"} onClick={() => doAction(stage.id, "start")} />}
                {isWorking && <ActionBtn label="⏹  Stop Work"    variant="warning"  onClick={() => setStopping(stage)} />}
                {isWorking && <ActionBtn label="⏸  Hold Work"    variant="ghost"    onClick={() => setHolding(stage)} />}
                {isHold    && <ActionBtn label="▶  Resume Work"  variant="default"  onClick={() => doAction(stage.id, "resume")} />}
                {isStopped && <ActionBtn label="➡  Move Next"   variant="success"  onClick={() => doAction(stage.id, "move-next")} />}
              </div>
            </div>
          );
        })
      )}

      {stopping && (
        <StopWorkModal
          stage={stopping}
          onClose={() => setStopping(null)}
          onDone={() => { setStopping(null); load(); }}
        />
      )}
      {holding && (
        <HoldModal
          stage={holding}
          onClose={() => setHolding(null)}
          onDone={() => { setHolding(null); load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — DEPARTMENT QUEUE
// Each department sees only their pending work
// ─────────────────────────────────────────────────────────────────────────────

function DepartmentQueueTab() {
  const [departments,  setDepartments]  = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [queue,        setQueue]        = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [stopping, setStopping] = useState(null);
  const [holding,  setHolding]  = useState(null);

  useEffect(() => {
    apiFetch("/departments")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d?.data ?? []);
        setDepartments(list);
        if (list.length > 0) setSelectedDept(String(list[0].id));
      })
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoadingDepts(false));
  }, []);

  const loadQueue = useCallback(() => {
    if (!selectedDept) return;
    setLoading(true);
    apiFetch(`/production/execution/department/${selectedDept}/queue`)
      .then((r) => r.json())
      .then((d) => setQueue(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load department queue"))
      .finally(() => setLoading(false));
  }, [selectedDept]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const doAction = async (stageId, action, body = {}) => {
    try {
      const res = await apiFetch(`/production/execution/stages/${stageId}/${action}`, {
        method: "PATCH", body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Action failed");
      }
      const labels = {
        start:       "Work started",
        resume:      "Work resumed",
        "move-next": "Handed off — next department is now ready",
      };
      toast.success(labels[action] ?? "Done");
      loadQueue();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deptName = departments.find(d => String(d.id) === selectedDept)?.name ?? "Department";

  return (
    <div>
      {/* Department selector */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
          Select Department
        </div>
        {loadingDepts ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading departments…</div>
        ) : departments.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            No departments configured. Add departments in the Departments section first.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {departments.map(d => (
              <button key={d.id}
                onClick={() => setSelectedDept(String(d.id))}
                style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: String(d.id) === selectedDept ? "2px solid #005fb8" : "2px solid #e2e8f0",
                  background: String(d.id) === selectedDept ? "#eff6ff" : "#fff",
                  color: String(d.id) === selectedDept ? "#005fb8" : "#374151",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {d.name}
              </button>
            ))}
            <button
              onClick={loadQueue}
              style={{ padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#f1f5f9", border: "2px solid #e2e8f0", color: "#374151", cursor: "pointer", marginLeft: "auto" }}
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {selectedDept && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{deptName} — Work Queue</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Pending, active and on-hold work for this department
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading queue…</div>
      ) : !selectedDept ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Select a department above.</div>
      ) : queue.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#f0fdf4", borderRadius: 14, border: "1px dashed #bbf7d0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#15803d" }}>{deptName} is clear!</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>No pending or active work in this department right now.</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
            {queue.length} item{queue.length !== 1 ? "s" : ""} in queue
          </div>
          {queue.map((stage) => {
            const isWorking = stage.status === "WORKING" || stage.status === "IN_PROGRESS";
            const isHold    = stage.status === "ON_HOLD"  || stage.status === "HOLD";
            const isStopped = stage.status === "STOPPED";
            const isReady   = stage.status === "READY";
            return (
              <div key={stage.id} style={{
                borderRadius: 10, marginBottom: 12,
                border: `2px solid ${isWorking ? "#005fb8" : isHold ? "#f59e0b" : isStopped ? "#ddd6fe" : "#e2e8f0"}`,
                background: isWorking ? "#f0f7ff" : isHold ? "#fffbeb" : isStopped ? "#faf5ff" : "#fff",
                padding: "16px 18px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 2 }}>{stage.itemName || "—"}</div>
                    <div style={{ fontSize: 13, color: "#005fb8", fontWeight: 700 }}>{stage.orderNo}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{stage.customerName}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <StatusBadge status={stage.status} />
                    <PriorityDot priority={stage.jobPriority} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Qty to Process</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{fmt(stage.planned_qty)}</div>
                  </div>
                  {Number(stage.completed_qty) > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: "#15803d", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Completed</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#15803d" }}>{fmt(stage.completed_qty)}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {isReady   && <ActionBtn label="▶  Start Work"   variant="default"  disabled={stage.material_gate === "SHORTAGE"} onClick={() => doAction(stage.id, "start")} />}
                  {isWorking && <ActionBtn label="⏹  Stop Work"    variant="warning"  onClick={() => setStopping(stage)} />}
                  {isWorking && <ActionBtn label="⏸  Hold Work"    variant="ghost"    onClick={() => setHolding(stage)} />}
                  {isHold    && <ActionBtn label="▶  Resume Work"  variant="default"  onClick={() => doAction(stage.id, "resume")} />}
                  {isStopped && <ActionBtn label="➡  Move Next"   variant="success"  onClick={() => doAction(stage.id, "move-next")} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stopping && (
        <StopWorkModal
          stage={stopping}
          onClose={() => setStopping(null)}
          onDone={() => { setStopping(null); loadQueue(); }}
        />
      )}
      {holding && (
        <HoldModal
          stage={holding}
          onClose={() => setHolding(null)}
          onDone={() => { setHolding(null); loadQueue(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ["Board View", "Work Orders", "My Work", "Department Queue"];

export default function ProductionExecutionPage() {
  const [tab, setTab] = useState(0);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
          Production Work Orders
        </h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Track manufacturing progress by department — auto-generated when orders are approved.
        </p>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "11px 22px", fontSize: 13, fontWeight: 700,
            color: tab === i ? "#005fb8" : "#64748b",
            borderBottom: tab === i ? "2px solid #005fb8" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <BoardViewTab />}
      {tab === 1 && <WorkOrdersTab />}
      {tab === 2 && <MyWorkTab />}
      {tab === 3 && <DepartmentQueueTab />}
    </div>
  );
}
