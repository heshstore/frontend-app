import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";
import UniversalSearch from "./components/UniversalSearch";
import { usePermission, hasAnyPermission } from "./utils/usePermission";
import { apiFetch } from "./utils/api";

export default function Dashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);

  const [showCustomer, setShowCustomer] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [showQuotation, setShowQuotation] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [showCrm, setShowCrm] = useState(false);
  const [showProduction, setShowProduction] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showFollow, setShowFollow] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Permission-based section visibility
  const canSeeCustomers    = usePermission('customer.view');
  const canSeeItems        = usePermission('item.view');
  const canSeeQuotations   = usePermission('quotation.view');
  const canSeeOrders       = usePermission('order.view');
  const canSeeProduction   = usePermission('production.view');
  const canSeeAccounts     = hasAnyPermission('invoice.view', 'payment.view');
  const canSeeDispatch     = usePermission('dispatch.view');
  const canSeeStaff        = hasAnyPermission('staff.view', 'rbac.manage');
  const canSeeCrm          = hasAnyPermission('lead.view', 'crm.analytics.self');
  const canSeeWhatsApp     = usePermission('whatsapp.manage');

  // STEP 1: Add state
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    apiFetch(`/orders`)
      .then(res => res.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
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
    apiFetch(`/shopify/sync`).catch(() => {});

    // Start polling immediately every 2 s
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/shopify/sync-status`);
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

      {/* CRM */}
      {canSeeCrm && (
        <>
          <button onClick={() => setShowCrm(!showCrm)} style={sectionBtn()}>
            + CRM {showCrm ? "▲" : "▼"}
          </button>
          {showCrm && (
            <div>
              <button style={subBtn} onClick={() => navigate("/crm/leads/new")}>• Create Lead</button>
              <button style={subBtn} onClick={() => navigate("/crm/leads")}>• View Leads</button>
              <button style={subBtn} onClick={() => navigate("/crm/analytics")}>• CRM Analytics</button>
              {canSeeWhatsApp && (
                <button style={subBtn} onClick={() => navigate("/whatsapp")}>• WhatsApp Connection</button>
              )}
            </div>
          )}
        </>
      )}

      {/* CUSTOMER */}
      {canSeeCustomers && (
        <>
          <button onClick={() => setShowCustomer(!showCustomer)} style={sectionBtn()}>
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
        </>
      )}

      {/* ITEM MASTER */}
      {canSeeItems && <button
        onClick={() => setShowItem(!showItem)}
        style={sectionBtn()}
      >
        + Item Master {showItem ? "▲" : "▼"}
      </button>}
      {canSeeItems && showItem && (
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
      {canSeeQuotations && (
        <>
          <button onClick={() => setShowQuotation(!showQuotation)} style={sectionBtn()}>
            + Quotation {showQuotation ? "▲" : "▼"}
          </button>
          {showQuotation && (
            <div>
              <button style={subBtn} onClick={() => navigate("/quotation")}>• Create Quotation</button>
              <button style={subBtn} onClick={() => navigate("/quotations")}>• View Quotation</button>
            </div>
          )}
        </>
      )}

      {/* ORDER */}
      {canSeeOrders && (
        <>
          <button onClick={() => setShowOrder(!showOrder)} style={sectionBtn()}>
            + Order {showOrder ? "▲" : "▼"}
          </button>
          {showOrder && (
            <div>
              <button style={subBtn} onClick={() => navigate("/order")}>• Create Order</button>
              <button style={subBtn} onClick={() => navigate("/orders")}>• View Order</button>
              <button style={subBtn} onClick={() => navigate("/pending-approval")}>• Pending Approval</button>
            </div>
          )}
        </>
      )}

      <hr />

      {/* PRODUCTION */}
      {canSeeProduction && (
        <>
          <button onClick={() => setShowProduction(!showProduction)} style={sectionBtn()}>
            + Production Management {showProduction ? "▲" : "▼"}
          </button>
          {showProduction && (
            <div>
              <button style={subBtn} onClick={() => navigate("/pending-approval")}>• Order Pending Approval</button>
              <button style={subBtn} onClick={() => navigate("/orders")}>• Production Pipeline</button>
              <button style={subBtn} onClick={() => navigate("/orders")}>• View Pipeline</button>
              <button style={subBtn} onClick={() => alert("Coming Soon")}>• Create Purchase Order</button>
              <button style={subBtn} onClick={() => alert("Coming Soon")}>• View Purchase Order</button>
            </div>
          )}
        </>
      )}

      {/* ACCOUNTS */}
      {canSeeAccounts && (
        <>
          <button onClick={() => setShowAccounts(!showAccounts)} style={sectionBtn()}>
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
              <button style={subBtn} onClick={() => navigate("/set-credit-limit")}>• Set Customer Credit Limit</button>
            </div>
          )}
        </>
      )}

      <hr />

      {/* DELIVERY */}
      {canSeeDispatch && (
        <>
          <button onClick={() => setShowDelivery(!showDelivery)} style={sectionBtn()}>
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
        </>
      )}

      {/* FOLLOW UPS */}
      {canSeeCustomers && (
        <>
          <button onClick={() => setShowFollow(!showFollow)} style={sectionBtn()}>
            + Follow Ups {showFollow ? "▲" : "▼"}
          </button>
          {showFollow && (
            <div>
              <button style={subBtn} onClick={() => alert("Coming Soon")}>• Add Customer Feedback</button>
            </div>
          )}
        </>
      )}

      {/* STAFF & SETTINGS */}
      {canSeeStaff && (
        <>
          <hr />
          <button onClick={() => setShowStaff(!showStaff)} style={sectionBtn()}>
            + Staff &amp; Settings {showStaff ? "▲" : "▼"}
          </button>
          {showStaff && (
            <div>
              <button style={subBtn} onClick={() => navigate("/staff")}>• Staff Management</button>
              <button style={subBtn} onClick={() => navigate("/rbac")}>• Roles &amp; Permissions</button>
            </div>
          )}
        </>
      )}

    </div>
    </div>
  );
}