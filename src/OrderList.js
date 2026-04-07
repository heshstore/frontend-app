import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

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
    const res = await axios.get("https://backend-service-xady.onrender.com/orders");
    setOrders(res.data.filter(o => o.status === 'order'));
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
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginRight: 10,
            padding: "6px 12px",
            cursor: "pointer"
          }}
        >
          ← Back
        </button>
        <h3 style={{ margin: 0, flex: 1 }}>Orders</h3>
      </div>

      {/* 1. CENTER SEARCH BAR */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 10
      }}>
        <input
          placeholder="Search by ID / Customer / Mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px",
            width: "320px",
            maxWidth: "90%",
            border: "1px solid #ccc",
            borderRadius: "6px",
            textAlign: "center"
          }}
        />
      </div>

      {/* 2. MOVE CREATE BUTTON RIGHT SIDE (SEPARATE ROW) */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 15
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            borderRadius: "4px"
          }}
        >
          + Create Order
        </button>
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
              <div><b>Customer:</b> {row.customer_name}</div>
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
                <button onClick={() => navigate(`/invoice/${row.id}`)}>View</button>
                <button onClick={() => navigate(`/edit-order/${row.id}`)}>Edit</button>
                {row.status === "order" && (
                  <button onClick={() => {
                    fetch(`https://backend-service-xady.onrender.com/orders/${row.id}/send-for-approval`, {
                      method: "PATCH"
                    })
                    .then(() => {
                      alert("Sent for approval");
                      window.location.href = "/orders/pending";
                    });
                  }}>
                    Send
                  </button>
                )}
                <button onClick={() => {
                  if (!window.confirm("Cancel order?")) return;
                  fetch(`https://backend-service-xady.onrender.com/orders/${row.id}`, {
                    method: "DELETE"
                  }).then(() => window.location.reload());
                }}>
                  Cancel
                </button>
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
                    <div>{row.customer_name}</div>
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
                        onClick={() => {
                          console.log("ORDER 👉", row);
                          navigate(`/invoice/${row.id}`);
                        }}
                      >
                        View
                      </button>

                      {/* EDIT BUTTON */}
                      <button onClick={() => navigate(`/edit-order/${row.id}`)}>
                        Edit
                      </button>

                      {/* SEND FOR APPROVAL BUTTON (ONLY for status = order) */}
                      {row.status === "order" && (
                        <button
                          onClick={() => {
                            fetch(`https://backend-service-xady.onrender.com/orders/${row.id}/send-for-approval`, {
                              method: "PATCH"
                            })
                            .then(() => {
                              alert("Sent for approval");
                              window.location.href = "/orders/pending";
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

                          fetch(`https://backend-service-xady.onrender.com/orders/${row.id}`, {
                            method: 'DELETE'
                          })
                            .then(res => {
                              if (!res.ok) throw new Error();
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