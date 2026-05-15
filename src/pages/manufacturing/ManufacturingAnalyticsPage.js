import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const C = {
  card: "#fff",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  blue: "#2563eb",
  green: "#15803d",
  red: "#b91c1c",
  amber: "#d97706",
};

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtPct(n) {
  return `${fmt(n)}%`;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 12, fontWeight: 800, color: C.muted,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 12,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CardGrid({ children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 12,
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, accent = C.blue }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "14px 16px", borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Table({ columns, rows, rowKey }) {
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb", textAlign: "left" }}>
            {columns.map((c) => (
              <th key={c.key} style={{ padding: "10px 12px", fontWeight: 700, color: C.muted }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} style={{ borderTop: `1px solid ${C.border}` }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "10px 12px", color: C.text }}>
                  {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ManufacturingAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState(null);
  const [overview, setOverview] = useState(null);
  const [deptPerf, setDeptPerf] = useState([]);
  const [delays, setDelays] = useState([]);
  const [wastage, setWastage] = useState([]);
  const [materials, setMaterials] = useState(null);
  const [profit, setProfit] = useState([]);
  const [deptCosts, setDeptCosts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        rIntel, rOv, rDept, rDel, rWaste, rMat, rProfit, rCosts,
      ] = await Promise.all([
        apiFetch("/manufacturing-analytics/intel"),
        apiFetch("/manufacturing-analytics/overview"),
        apiFetch("/manufacturing-analytics/departments/performance"),
        apiFetch("/manufacturing-analytics/delays?limit=10"),
        apiFetch("/manufacturing-analytics/wastage/leaders?limit=10"),
        apiFetch("/manufacturing-analytics/materials?limit=12"),
        apiFetch("/manufacturing-analytics/profitability/orders?limit=30"),
        apiFetch("/manufacturing-analytics/department-costs"),
      ]);
      const parse = async (r) => (r.ok ? r.json() : null);
      setIntel(await parse(rIntel));
      setOverview(await parse(rOv));
      setDeptPerf(await parse(rDept) || []);
      setDelays(await parse(rDel) || []);
      setWastage(await parse(rWaste) || []);
      setMaterials(await parse(rMat));
      setProfit(await parse(rProfit) || []);
      setDeptCosts(await parse(rCosts) || []);
    } catch (e) {
      toast.error(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !intel && !overview) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: C.muted }}>
        Loading manufacturing analytics…
      </div>
    );
  }

  const snap = overview?.costSnapshots || {};

  return (
    <div style={{
      padding: "20px 22px 40px",
      maxWidth: 1200,
      margin: "0 auto",
      fontFamily: "system-ui, sans-serif",
      color: C.text,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Manufacturing analytics</h1>
          <p style={{ margin: "8px 0 0", color: C.muted, fontSize: 14 }}>
            Read-only operational intelligence — ledger and reservations are never modified from this view.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "#fff", fontWeight: 700, cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <Section title="Cost overview (snapshotted jobs in period)">
        <CardGrid>
          <StatCard label="Raw material (snapshots)" value={`₹${fmt(snap.raw_material_cost)}`} accent={C.blue} />
          <StatCard label="Production labour" value={`₹${fmt(snap.production_cost)}`} accent={C.amber} />
          <StatCard label="Wastage / variance" value={`₹${fmt(snap.wastage_cost)}`} accent={C.red} />
          <StatCard label="Dispatch (in snapshot)" value={`₹${fmt(snap.dispatch_cost)}`} accent={C.green} />
          <StatCard label="Total cost captured" value={`₹${fmt(snap.total_cost)}`} sub={`${snap.snapshot_count || 0} snapshots`} />
        </CardGrid>
      </Section>

      <Section title="Production efficiency & exposure">
        <CardGrid>
          <StatCard label="WIP order value" value={`₹${fmt(intel?.wip_order_value)}`} />
          <StatCard label="Active execution jobs" value={fmt(intel?.active_execution_jobs)} />
          <StatCard label="Efficiency (rough)" value={fmtPct(intel?.production_efficiency_pct)} sub="Worked vs planned minutes heuristic" />
          <StatCard label="Delayed stage hints" value={fmt(intel?.delayed_execution_hints)} accent={C.red} />
          <StatCard label="Pending dispatch value (lines)" value={`₹${fmt(intel?.pending_dispatch_value)}`} />
          <StatCard label="Procurement exposure" value={`₹${fmt(intel?.procurement_exposure)}`} />
          <StatCard label="FG stock value (est.)" value={`₹${fmt(intel?.fg_stock_value)}`} />
          <StatCard label="Loss-making orders (hint)" value={fmt(intel?.loss_making_orders)} accent={C.red} />
        </CardGrid>
      </Section>

      <Section title="Profitability (recent orders)">
        <Table
          rowKey={(r, i) => r.orderId ?? i}
          columns={[
            { key: "orderNo", label: "Order" },
            { key: "customerName", label: "Customer" },
            { key: "salesValue", label: "Sales", render: (v) => `₹${fmt(v)}` },
            { key: "manufacturingCost", label: "Mfg cost", render: (v) => `₹${fmt(v)}` },
            { key: "dispatchCost", label: "Dispatch", render: (v) => `₹${fmt(v)}` },
            { key: "grossProfit", label: "Gross profit", render: (v) => (
              <span style={{ color: Number(v) < 0 ? C.red : C.green, fontWeight: 700 }}>
                ₹{fmt(v)}
              </span>
            ) },
            { key: "grossMarginPct", label: "Margin %", render: (v) => fmtPct(v) },
            { key: "orderStatus", label: "Status" },
          ]}
          rows={profit}
        />
      </Section>

      <Section title="Department performance">
        <Table
          rowKey={(r) => r.departmentId}
          columns={[
            { key: "departmentName", label: "Department" },
            { key: "stagesCompleted", label: "Stages done" },
            { key: "avgWorkingMinutes", label: "Avg working min", render: (v) => fmt(v) },
            { key: "holdCount", label: "Holds recorded" },
            { key: "wipPlannedQty", label: "WIP planned qty", render: (v) => fmt(v) },
            { key: "outputQty", label: "Output qty", render: (v) => fmt(v) },
          ]}
          rows={deptPerf}
        />
      </Section>

      <Section title="Delay insights">
        <Table
          rowKey={(r, i) => `${r.departmentName}-${i}`}
          columns={[
            { key: "departmentName", label: "Department" },
            { key: "delayedStages", label: "Open > 24h" },
            { key: "avgHoursOpen", label: "Avg hours open", render: (v) => fmt(v) },
          ]}
          rows={delays}
        />
      </Section>

      <Section title="Wastage — top FG items (from snapshots)">
        <Table
          rowKey={(r) => r.itemId}
          columns={[
            { key: "itemName", label: "Item" },
            { key: "wastageCost", label: "Wastage ₹", render: (v) => `₹${fmt(v)}` },
            { key: "producedQty", label: "Produced qty", render: (v) => fmt(v) },
          ]}
          rows={wastage}
        />
      </Section>

      <Section title="Material insights">
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
          Top consumption, shortages, and high-rate materials (from inventory transactions and purchase requirements).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Top consumed</div>
            <Table
              rowKey={(r) => r.itemId}
              columns={[
                { key: "itemName", label: "Item" },
                { key: "qtyOut", label: "Qty OUT", render: (v) => fmt(v) },
                { key: "valueOut", label: "Value ₹", render: (v) => `₹${fmt(v)}` },
              ]}
              rows={materials?.topConsumed || []}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Shortage frequency</div>
            <Table
              rowKey={(r) => r.itemId}
              columns={[
                { key: "itemName", label: "Item" },
                { key: "shortageEvents", label: "Events" },
                { key: "shortageQty", label: "Qty", render: (v) => fmt(v) },
              ]}
              rows={materials?.shortages || []}
            />
          </div>
        </div>
      </Section>

      <Section title="Department cost rates (₹/hour)">
        <p style={{ fontSize: 13, color: C.muted, marginTop: 0 }}>
          Labour cost in snapshots uses actual working minutes × (cost + manpower + overhead) per department.
        </p>
        <Table
          rowKey={(r) => r.id ?? r.departmentId}
          columns={[
            { key: "departmentId", label: "Dept ID" },
            { key: "costPerHour", label: "Cost/hr", render: (v) => `₹${fmt(v)}` },
            { key: "manpowerRate", label: "Manpower/hr", render: (v) => `₹${fmt(v)}` },
            { key: "overheadRate", label: "Overhead/hr", render: (v) => `₹${fmt(v)}` },
            { key: "active", label: "Active", render: (v) => (v ? "Yes" : "No") },
          ]}
          rows={deptCosts}
        />
      </Section>
    </div>
  );
}
