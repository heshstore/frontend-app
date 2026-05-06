import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ORDER_STATUS, ORDER_STATUS_LABELS } from "./constants/orderStatus";
import { API_URL } from "./config";
import { apiFetch } from "./utils/api";
import DocActions from "./components/DocActions";
import { useNotifications } from "./context/NotificationContext";
import { useRightPanel } from "./components/layout/RightPanel";
import OrderDetail from "./OrderDetail";

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { dismissByEntity } = useNotifications();
  const { openPanel } = useRightPanel();

  // 1. ADD SCREEN WIDTH DETECTION
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`);
      // Show all non-cancelled, non-draft orders
      setOrders(res.data.filter(o =>
        o.status !== ORDER_STATUS.CANCELLED &&
        o.status !== ORDER_STATUS.DRAFT
      ));
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) =>
    (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.mobile || "").includes(search) ||
    String(o.id).includes(search)
  );

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',Arial,sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '16px 20px 0' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Orders</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/order')}
            style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
          >
            + New Order
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px 20px 0",
        flexWrap: "wrap",
        gap: 10
      }}>
        <input
          placeholder="Search by ID / Customer / Mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px",
            width: "360px",
            maxWidth: "100%",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: 13,
          }}
        />
      </div>

      {/* 5. MAKE TABLE RESPONSIVE */}
      <div style={{ overflowX: "auto" }}>
        {isMobile ? (
          filteredOrders.map((row) => (
            <div key={row.id} style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
              background: "#fff"
            }}>
              <div><b>ID:</b> {row.id}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b>{row.customer_name}</b>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8,
                  background: row.is_wholesaler ? "#fef9c3" : "#dbeafe",
                  color: row.is_wholesaler ? "#a16207" : "#1e40af",
                }}>
                  {row.is_wholesaler ? "WHOLESALER" : "RETAILER"}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {row.mobile || ""}
              </div>
              <div><b>Amount:</b> ₹ {Number(row.total_amount || 0).toLocaleString()}</div>
              <div><b>Status:</b> {row.status}</div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginTop: "10px"
              }}>
                {/* KEEP SAME BUTTONS */}
                <button onClick={() => openPanel(`Order #${row.order_number || row.id}`, <OrderDetail orderId={row.id} />)}>View</button>
                <button onClick={() => navigate(`/edit-order/${row.id}`)}>Edit</button>
                      {row.status === ORDER_STATUS.DRAFT && (
                  <button onClick={() => {
                    apiFetch(`/orders/${row.id}/send-for-approval`, { method: "PATCH" })
                    .then(() => {
                      alert("Sent for approval");
                      navigate("/pending-approval");
                    });
                  }}>
                    Send
                  </button>
                )}
                <button onClick={() => {
                  if (!window.confirm("Cancel order?")) return;
                  apiFetch(`/orders/${row.id}/cancel`, { method: "PATCH" })
                    .then(() => { dismissByEntity('order', row.id); window.location.reload(); });
                }}>
                  Cancel
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <DocActions
                  type="order"
                  id={row.id}
                  docNo={row.order_number}
                  amount={row.total_amount}
                  customerMobile={row.mobile}
                />
              </div>
            </div>
          ))
        ) : (
          <table
            border="1"
            cellPadding="10"
            style={{
              marginTop: 20,
              width: "100%",
              overflowX: "auto"
            }}
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Order Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    {row.created_at
                      ? new Date(row.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{row.customer_name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8,
                        background: row.is_wholesaler ? "#fef9c3" : "#dbeafe",
                        color: row.is_wholesaler ? "#a16207" : "#1e40af",
                      }}>
                        {row.is_wholesaler ? "WHOLESALER" : "RETAILER"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {row.city || ""} {row.mobile ? `| ${row.mobile}` : ""}
                    </div>
                  </td>
                  {/* 3. ADD TOTAL BELOW ORDER VALUE */}
                  <td>
                    <div>₹ {Number(row.total_amount || 0).toLocaleString()}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Total: ₹ {Number(row.total_amount || 0).toLocaleString()}
                    </div>
                  </td>
                  <td>{row.status}</td>
                  {/* 4. MOBILE FRIENDLY ACTION BUTTONS */}
                  <td>
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      justifyContent: "center"
                    }}>
                      {/* KEEP EXISTING BUTTONS HERE */}
                      <button
                        onClick={() => openPanel(`Order #${row.order_number || row.id}`, <OrderDetail orderId={row.id} />)}
                      >
                        View
                      </button>

                      {/* EDIT BUTTON */}
                      <button onClick={() => navigate(`/edit-order/${row.id}`)}>
                        Edit
                      </button>

                      {/* SEND FOR APPROVAL BUTTON (ONLY for status = order) */}
                      {row.status === ORDER_STATUS.DRAFT && (
                        <button
                          onClick={() => {
                            apiFetch(`/orders/${row.id}/send-for-approval`, { method: "PATCH" })
                            .then(() => {
                              alert("Sent for approval");
                              navigate("/pending-approval");
                            });
                          }}
                        >
                          Send for Approval
                        </button>
                      )}

                      {/* Cancel button per STRICT MODE instructions */}
                      <button
                        onClick={() => {
                          const confirmCancel = window.confirm("Cancel this order?");
                          if (!confirmCancel) return;

                          apiFetch(`/orders/${row.id}/cancel`, { method: 'PATCH' })
                            .then(res => {
                              if (!res.ok) throw new Error();
                              dismissByEntity('order', row.id);
                              alert('Order cancelled');
                              window.location.reload();
                            })
                            .catch(() => {
                              alert('Cancel failed');
                            });
                        }}
                      >
                        Cancel
                      </button>
                      {/* PAY BUTTON REMOVED PER INSTRUCTIONS */}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <DocActions
                        type="order"
                        id={row.id}
                        docNo={row.order_number}
                        amount={row.total_amount}
                        customerMobile={row.mobile}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}