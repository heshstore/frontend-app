import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";

export default function Dashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);

  const [showCustomer, setShowCustomer] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [showQuotation, setShowQuotation] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [showProduction, setShowProduction] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showFollow, setShowFollow] = useState(false);

  useEffect(() => {
    axios
      .get("https://backend-service-xady.onrender.com/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err));
  }, []);

  const totalOrders = orders.length;

  const totalPending = orders.reduce(
    (sum, o) => sum + Number(o.pending_amount || 0),
    0
  );

  const todaySales = orders.reduce((sum, o) => {
    const isToday =
      new Date(o.created_at).toDateString() ===
      new Date().toDateString();
    return isToday ? sum + Number(o.total_amount || 0) : sum;
  }, 0);

  const sectionBtn = () => ({
    width: "100%",
    padding: 14,
    background: "linear-gradient(90deg, #2563EB, #38BDF8)",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    textAlign: "left",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    marginBottom: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  });

  const subBtn = {
    width: "100%",
    padding: 12,
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    textAlign: "left",
    marginBottom: 8,
    cursor: "pointer",
    fontSize: 14,
    color: "#111827",
  };

  // 🚀 Only handleLogout navigates away on logout!
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/");
  };

  return (
    <div style={{ padding: 20, maxWidth: 420, margin: "auto", background: theme.background }}>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>

      {/* STATS */}
      <div style={{ marginBottom: 25 }}>
        <p>📦 Orders: {totalOrders}</p>
        <p>💰 Pending: ₹ {totalPending}</p>
        <p>📈 Today Sales: ₹ {todaySales}</p>
      </div>

      {/* CUSTOMER */}
      <button
        onClick={() => setShowCustomer(!showCustomer)}
        style={sectionBtn()}
      >
        + Customer Master {showCustomer ? "▲" : "▼"}
      </button>
      {showCustomer && (
        <div>
          <button style={subBtn} onClick={() => setShowCustomer(!showCustomer)}>• Create Customer</button>
          <button style={subBtn} onClick={() => navigate("/customers")}>• Search Customer</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Scan Customer Visiting Card</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Print Envelop</button>
        </div>
      )}

      {/* ITEM MASTER */}
      <button
        onClick={() => setShowItem(!showItem)}
        style={sectionBtn()}
      >
        + Item Master {showItem ? "▲" : "▼"}
      </button>
      {showItem && (
        <div>
          <button
            style={subBtn}
            onClick={() => {
              console.log("Add Item clicked");
              navigate("/add-item");
            }}
          >• Add Service Item</button>
          <button
            style={subBtn}
            onClick={() => {
              console.log("View Item clicked");
              navigate("/items");
            }}
          >• View Service Item</button>
          <button
            style={subBtn}
            onClick={async () => {
              try {
                const res = await fetch("https://backend-service-xady.onrender.com/shopify/sync-products");
                const data = await res.json();
                alert(`✅ Sync Done: ${data.count} items`);
              } catch (err) {
                alert("❌ Sync Failed");
              }
            }}
          >
            • Sync Shopify Items
          </button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Shopify Items</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Update Price List</button>
          <button style={subBtn} onClick={() => navigate("/items")}>• Item Price List View</button>
        </div>
      )}

      <hr />

      {/* QUOTATION */}
      <button
        onClick={() => setShowQuotation(!showQuotation)}
        style={sectionBtn()}
      >
        + Quotation {showQuotation ? "▲" : "▼"}
      </button>
      {showQuotation && (
        <div>
          <button style={subBtn} onClick={() => setShowQuotation(!showQuotation)}>• Create Quotation</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Quotation</button>
        </div>
      )}

      {/* ORDER */}
      <button
        onClick={() => setShowOrder(!showOrder)}
        style={sectionBtn()}
      >
        + Order {showOrder ? "▲" : "▼"}
      </button>
      {showOrder && (
        <div>
          <button style={subBtn} onClick={() => setShowOrder(!showOrder)}>• Create Order</button>
          <button style={subBtn} onClick={() => navigate("/orders")}>• View Order</button>
          <button style={subBtn} onClick={() => navigate("/orders")}>• Approved Order</button>
        </div>
      )}

      <hr />

      {/* PRODUCTION */}
      <button
        onClick={() => setShowProduction(!showProduction)}
        style={sectionBtn()}
      >
        + Production Management {showProduction ? "▲" : "▼"}
      </button>
      {showProduction && (
        <div>
          <div
            onClick={() => navigate("/orders")}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "14px 16px",
              marginTop: "10px",
              background: "#f9f9f9",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "400"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f1f1f1"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#f9f9f9"}
          >
            • Order Pending Approval
          </div>
          <button style={subBtn} onClick={() => navigate("/orders")}>• Production Pipeline</button>
          <button style={subBtn} onClick={() => navigate("/orders")}>• View Pipeline</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Create Purchase Order</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Purchase Order</button>
        </div>
      )}

      {/* ACCOUNTS */}
      <button
        onClick={() => setShowAccounts(!showAccounts)}
        style={sectionBtn()}
      >
        + Accounts {showAccounts ? "▲" : "▼"}
      </button>
      {showAccounts && (
        <div>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Create Invoice</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Invoice</button>
          <button style={subBtn} onClick={() => navigate("/orders")}>• View Production Completed Order</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Payment Entry</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Ledger</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Commission Calculation</button>
        </div>
      )}

      <hr />

      {/* DELIVERY */}
      <button
        onClick={() => setShowDelivery(!showDelivery)}
        style={sectionBtn()}
      >
        + Delivery {showDelivery ? "▲" : "▼"}
      </button>
      {showDelivery && (
        <div>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Create Labels</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Labels</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Dispatch</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Add Dispatch Details</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Dispatch Details</button>
        </div>
      )}

      {/* FOLLOW UPS */}
      <button
        onClick={() => setShowFollow(!showFollow)}
        style={sectionBtn()}
      >
        + Follow Ups {showFollow ? "▲" : "▼"}
      </button>
      {showFollow && (
        <div>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Add Customer Feedback</button>
        </div>
      )}

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: 25,
          width: "100%",
          padding: 12,
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: "bold",
        }}
      >
        Logout
      </button>
    </div>
  );
}