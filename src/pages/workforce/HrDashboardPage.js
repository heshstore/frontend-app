import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";
import { hasAnyPermission } from "../../utils/usePermission";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "16px 18px",
  marginBottom: 14,
};

function fmt(n) {
  return Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

export default function HrDashboardPage() {
  const [dash, setDash] = useState(null);
  const [avail, setAvail] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, a, pl] = await Promise.all([
        apiFetch("/workforce-ops/dashboard").then((r) => (r.ok ? r.json() : null)),
        apiFetch("/workforce-ops/availability").then((r) => (r.ok ? r.json() : null)),
        hasAnyPermission("staff.edit")
          ? apiFetch("/workforce-ops/leave-requests?status=PENDING").then((r) => (r.ok ? r.json() : []))
          : Promise.resolve([]),
      ]);
      setDash(d);
      setAvail(a);
      setPendingLeaves(Array.isArray(pl) ? pl : []);
    } catch {
      toast.error("Failed to load HR dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !dash) return <div style={{ padding: 24, color: "#64748b" }}>Loading…</div>;

  return (
    <div style={{ padding: "16px 18px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>HR operations</h1>
      <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
        Workforce attendance and availability — not payroll or compliance HRMS.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <Link to="/workforce/attendance" style={pill("#005fb8")}>Attendance</Link>
        <Link to="/workforce/profiles" style={pill("#0f766e")}>Profiles</Link>
        <Link to="/workforce/leaves" style={pill("#7c3aed")}>Leave</Link>
        <Link to="/workforce/shifts" style={pill("#b45309")}>Shifts</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {[
          { k: "p", label: "Present today", v: dash?.presentCount ?? "—" },
          { k: "a", label: "Absent (profiled)", v: dash?.absentCount ?? "—" },
          { k: "u", label: "Utilization %", v: dash?.workforceUtilizationPct != null ? `${fmt(dash.workforceUtilizationPct)}%` : "—" },
          { k: "t", label: "Active technicians", v: dash?.activeTechnicians ?? "—" },
          { k: "o", label: "OT hours today", v: dash?.overtimeHoursToday != null ? `${fmt(dash.overtimeHoursToday)}h` : "—" },
          { k: "l", label: "Leaves pending", v: dash?.pendingLeaveRequests ?? "—" },
        ].map((x) => (
          <div key={x.k} style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{x.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{x.v}</div>
          </div>
        ))}
      </div>

      {dash?.overloadedDepartments?.length > 0 && (
        <div style={{ ...card, borderColor: "#fecaca", background: "#fef2f2" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Departments with open jobs above manpower</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {dash.overloadedDepartments.map((d) => (
              <li key={d.id}>
                {d.name} — open jobs {d.open_jobs}, manpower {d.manpower_capacity}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ ...card }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Department presence today</div>
        <div style={{ overflowX: "auto", fontSize: 13 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Department</th>
                <th style={{ padding: 8 }}>Manpower cap</th>
                <th style={{ padding: 8 }}>Present</th>
              </tr>
            </thead>
            <tbody>
              {(dash?.departmentsToday || []).map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{d.name}</td>
                  <td style={{ padding: 8 }}>{d.manpower_capacity ?? "—"}</td>
                  <td style={{ padding: 8 }}>{d.present_today ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {avail && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Present ({avail.presentEmployees?.length ?? 0})</div>
            <div style={{ fontSize: 12, maxHeight: 200, overflow: "auto" }}>
              {(avail.presentEmployees || []).map((r) => (
                <div key={r.id}>{r.user_name} {r.employee_code ? `· ${r.employee_code}` : ""}</div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Absent ({avail.absentEmployees?.length ?? 0})</div>
            <div style={{ fontSize: 12, maxHeight: 200, overflow: "auto" }}>
              {(avail.absentEmployees || []).map((r) => (
                <div key={r.id}>{r.name} {r.employee_code ? `· ${r.employee_code}` : ""}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pendingLeaves.length > 0 && (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Pending leave approvals</div>
          {pendingLeaves.slice(0, 15).map((lr) => (
            <div key={lr.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6, fontSize: 13 }}>
              <span>{lr.user_name} · {lr.leave_type} · {String(lr.from_date).slice(0, 10)} → {String(lr.to_date).slice(0, 10)}</span>
              {hasAnyPermission("staff.edit") && (
                <>
                  <button type="button" style={btn("#15803d")} onClick={() => approve(lr.id, load)}>Approve</button>
                  <button type="button" style={btn("#b91c1c")} onClick={() => reject(lr.id, load)}>Reject</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ProductivityStrip />
    </div>
  );
}

function ProductivityStrip() {
  const [p, setP] = useState(null);
  useEffect(() => {
    apiFetch("/workforce-ops/productivity")
      .then((r) => (r.ok ? r.json() : null))
      .then(setP)
      .catch(() => setP(null));
  }, []);
  if (!p) return null;
  return (
    <div style={{ ...card, marginTop: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Productivity (read-only, ~30d)</div>
      <div style={{ fontSize: 13, color: "#475569", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        <div>Stages completed: <strong>{p.productionJobStagesCompleted}</strong></div>
        <div>Avg working min (completed): <strong>{Math.round(p.avgWorkingMinutesCompletedStages || 0)}</strong></div>
        <div>Hold-related rows: <strong>{p.stageHoldOrHoldMinutesCount}</strong></div>
        <div>Attendance present %: <strong>{p.attendancePresentRatioPct}%</strong></div>
        <div>Tickets resolved: <strong>{p.serviceTicketsResolved}</strong></div>
      </div>
    </div>
  );
}

function pill(bg) {
  return {
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: 8,
    background: bg,
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
  };
}

function btn(bg) {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

async function approve(id, reload) {
  const r = await apiFetch(`/workforce-ops/leave-requests/${id}/approve`, { method: "POST" });
  if (!r.ok) toast.error("Approve failed");
  else { toast.success("Approved"); reload(); }
}

async function reject(id, reload) {
  const r = await apiFetch(`/workforce-ops/leave-requests/${id}/reject`, { method: "POST" });
  if (!r.ok) toast.error("Reject failed");
  else { toast.success("Rejected"); reload(); }
}
