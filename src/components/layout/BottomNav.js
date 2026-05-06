import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TABS = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Leads",     path: "/crm/leads" },
  { name: "Customers", path: "/customers" },
  { name: "Orders",    path: "/orders" },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 60,
      display: "flex", justifyContent: "space-around", alignItems: "center",
      background: "#0b5ed7", color: "#fff", zIndex: 500,
    }}>
      {TABS.map(tab => {
        const active = location.pathname.startsWith(tab.path);
        return (
          <div
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              cursor: "pointer",
              fontWeight: active ? 700 : 400,
              fontSize: 13,
              opacity: active ? 1 : 0.75,
              padding: "8px 12px",
            }}
          >
            {tab.name}
          </div>
        );
      })}
    </div>
  );
}
