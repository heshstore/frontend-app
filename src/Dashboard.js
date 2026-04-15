import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";
import UniversalSearch from "./components/UniversalSearch";

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
  const [syncing, setSyncing] = useState(false);

  // STEP 1: Add state
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    axios
      .get("http://localhost:3000/orders")
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


  const [syncPhase, setSyncPhase] = useState("idle"); // idle | fetching | saving | done

  const handleSync = () => {
    setSyncing(true);
    setProgress(0);
    setSyncPhase("fetching");

    // Fire sync — do NOT await (long-running)
    fetch("http://localhost:3000/shopify/sync").catch(() => {});

    // Start polling immediately every 2 s
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:3000/shopify/sync-status");
        const st = await res.json();

        setSyncPhase(st.phase || (st.status === "done" ? "done" : "fetching"));

        if (st.total > 0) {
          const percent = Math.round((st.processed / st.total) * 100);
          setProgress(Math.min(percent, 99));
        }

        if (st.status === "done") {
          clearInterval(interval);
          setProgress(100);
          setSyncPhase("done");
          const skipped = st.skipped ? ` · ${st.skipped} skipped` : "";
          alert(`✅ Sync Done: ${st.processed} items synced${skipped}`);
          setSyncing(false);
          setSyncPhase("idle");
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);
  };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.background, minHeight: '100vh' }}>
      {/* Sticky header with search */}
      <div
        style={{
          background: theme.primary,
          color: '#fff',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
          Dashboard
        </h2>
        <UniversalSearch />
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#fff',
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 13,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Logout
        </button>
      </div>

    <div style={{ padding: 20, maxWidth: 420, margin: "auto" }}>

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
          <button style={subBtn} onClick={() => navigate("/add-customer")}>• Create Customer</button>
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
          {syncing && (
            <div
              style={{
                background: "#fffbe6",
                border: "1px solid #fbbf24",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 10,
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6, color: "#92400e" }}>
                {syncPhase === "fetching"
                  ? "⏳ Fetching products from Shopify…"
                  : `🔄 Saving items… ${progress}% (${Math.round((progress / 100) * (progress > 0 ? 100 : 1))} done)`}
              </div>
              {/* Indeterminate bar while fetching; real % bar while saving */}
              {syncPhase === "fetching" ? (
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: "#fde68a",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      height: "100%",
                      width: "40%",
                      background: "#f59e0b",
                      borderRadius: 4,
                      animation: "slideAnim 1.4s ease-in-out infinite",
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: "#fde68a",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progress}%`,
                        background: "#16a34a",
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: "#374151", minWidth: 36 }}>
                    {progress}%
                  </span>
                </div>
              )}
              <div style={{ marginTop: 5, fontSize: 11, color: "#78350f" }}>
                Do not close this page
              </div>
            </div>
          )}
          <style>{`
            @keyframes slideAnim {
              0% { left: -40%; }
              100% { left: 100%; }
            }
          `}</style>
          <button
            style={subBtn}
            disabled={syncing}
            onClick={handleSync}
          >
            {syncing ? "⏳ Syncing... Please wait" : "• Sync Shopify Items"}
          </button>
          <button style={subBtn} onClick={() => navigate('/shopify-items')}>• View Shopify Items</button>
          <button style={subBtn} onClick={() => alert("Coming Soon")}>• Price List </button>
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
          <button style={subBtn} onClick={() => navigate("/quotation")}>• Create Quotation</button>
          <button style={subBtn} onClick={() => navigate("/quotations")}>• View Quotation</button>
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
          {/* REWRITE HERE for 'Create Order' button: setShowOrder -> navigate("/order") */}
          <button style={subBtn} onClick={() => navigate("/order")}>• Create Order</button>
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
          <button style={subBtn} onClick={() => alert("Coming Soon")}>
            • Set Customer Credit Limit
          </button>
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

    </div>
    </div>
  );
}