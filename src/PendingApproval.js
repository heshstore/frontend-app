import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ORDER_STATUS } from "./constants/orderStatus";
import { apiFetch } from "./utils/api";
import { API_URL } from "./config";

export default function PendingApproval() {
  const [orders, setOrders] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

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
      const pending = res.data.filter(
        (o) => o.status === ORDER_STATUS.PENDING_APPROVAL
      );
      setOrders(pending);
    } catch (err) {
      console.error("Error loading orders", err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const approveOrder = async (id) => {
    try {
      const res = await apiFetch(`/orders/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      alert("Order Approved");
      loadOrders();
    } catch {
      alert("Approve failed");
    }
  };

  const rejectOrder = async (id) => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;

    try {
      const res = await apiFetch(`/orders/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      alert("Order Rejected");
      loadOrders();
    } catch {
      alert("Reject failed");
    }
  };

  const filteredOrders = orders.filter((o) => {
    const text = search.toLowerCase();
    return (
      o.id?.toString().includes(text) ||
      o.customer_name?.toLowerCase().includes(text) ||
      o.mobile?.includes(text)
    );
  });

  return (
    <div style={{ padding: 20 }}>
      <h2>Order Pending Approval</h2>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "10px"
      }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "8px 14px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          ← Back
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <input
            type="text"
            placeholder="Search by ID / Customer / Mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px",
              width: "300px",
              maxWidth: "100%",
              borderRadius: "6px",
              border: "1px solid #ccc",
              textAlign: "center"
            }}
          />
        </div>
      </div>
      {isMobile ? (
        filteredOrders.map((o) => (
          <div
            key={o.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
              background: "#fff",
            }}
          >
            <div><b>Order No:</b> {o.id}</div>
            <div>
              <b>Date:</b> {o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}
            </div>
            <div><b>Customer:</b> {o.customer_name}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              {o.city || ""} {o.mobile ? `| ${o.mobile}` : ""}
            </div>
            <div>
              <b>Amount:</b> ₹ {Number(o.total_amount || 0).toLocaleString()}
            </div>
            <div><b>Status:</b> {o.status}</div>
            <div><b>Salesman:</b> {o.salesman || "-"}</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginTop: "10px",
              }}
            >
              <button onClick={() => window.location.href = `/invoice/${o.id}`}>
                View
              </button>
              <button onClick={() => approveOrder(o.id)}>
                Approve
              </button>
              <button onClick={() => rejectOrder(o.id)}>
                Reject
              </button>
            </div>
          </div>
        ))
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table border="1" cellPadding="10" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Order Value</th>
                <th>Status</th>
                <th>Salesman</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>
                    {o.created_at
                      ? new Date(o.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <div>{o.customer_name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {o.city || ""} {o.mobile ? `| ${o.mobile}` : ""}
                    </div>
                  </td>
                  <td>
                    ₹ {Number(o.total_amount || 0).toLocaleString()}
                  </td>
                  <td>{o.status}</td>
                  <td>{o.salesman || "-"}</td>
                  <td>
                    <button onClick={() => window.location.href = `/invoice/${o.id}`}>
                      View
                    </button>
                    <button onClick={() => approveOrder(o.id)}>
                      Approve
                    </button>
                    <button onClick={() => rejectOrder(o.id)}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}