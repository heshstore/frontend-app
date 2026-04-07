import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(""); // 1. ADD SEARCH STATE
  const navigate = useNavigate();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get("https://backend-service-xady.onrender.com/orders");
      setOrders(res.data.filter(o => o.status === 'quotation'));
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // 2. ADD FILTER
  const filteredOrders = orders.filter((o) =>
    (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.mobile || "").includes(search) ||
    String(o.id).includes(search)
  );

  const tableCellStyle = { padding: "8px 12px", textAlign: "center" };
  const buttonStyle = { marginRight: "8px", marginBottom: "4px" };

  return (
    <div style={{ padding: 24, maxWidth: 950, margin: "0 auto" }}>
      {/* 1. ADD BACK BUTTON (TOP) */}
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "10px",
          padding: "6px 12px",
          cursor: "pointer"
        }}
      >
        ← Back
      </button>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Quotation List</h2>
        <button
          style={{
            padding: "8px 18px",
            fontWeight: "bold",
            fontSize: "15px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => navigate("/")}
        >
          + New Order
        </button>
      </div>

      {/* 3. CENTER SEARCH BAR (TOP) */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 20
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

      {loading ? (
        <div style={{ padding: "25px 0", textAlign: "center" }}>Loading...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ padding: "18px 0", textAlign: "center", color: "#666" }}>
          No orders found
        </div>
      ) : (
        // 8. MOBILE SAFETY - WRAP TABLE
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="0"
            cellSpacing="0"
            style={{
              marginTop: 10,
              borderCollapse: "collapse",
              width: "100%",
              background: "#fff",
            }}
          >
            <thead style={{ background: "#f2f6fa" }}>
              {/* 2. UPDATE TABLE HEADERS */}
              <tr>
                <th>Quotation No.</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Quotation Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* 3. UPDATE ROW DATA */}
              {filteredOrders.map((row) => (
                <tr key={row.id}>
                  <td style={tableCellStyle}>{row.id}</td>
                  <td style={tableCellStyle}>
                    {row.created_at
                      ? new Date(row.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={tableCellStyle}>
                    <div>{row.customer_name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {row.city || ""} {row.mobile ? `| ${row.mobile}` : ""}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    ₹ {Number(row.total_amount || 0).toLocaleString()}
                  </td>
                  <td style={tableCellStyle}>{row.status}</td>
                  <td style={tableCellStyle}>
                    {/* KEEP EXISTING BUTTONS */}
                    <button
                      style={buttonStyle}
                      onClick={() => navigate(`/invoice/${row.id}`)}
                    >
                      View
                    </button>
                    <button
                      style={buttonStyle}
                      onClick={() => navigate(`/edit-order/${row.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      style={buttonStyle}
                      onClick={() => {
                        if (!window.confirm("Cancel quotation?")) return;
                        fetch(`https://backend-service-xady.onrender.com/orders/${row.id}`, {
                          method: "DELETE"
                        })
                          .then(res => {
                            if (!res.ok) throw new Error();
                            alert("Quotation cancelled");
                            window.location.reload();
                          })
                          .catch(() => alert("Cancel failed"));
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      style={buttonStyle}
                      onClick={() => {
                        fetch(`https://backend-service-xady.onrender.com/orders/${row.id}/convert-to-order`, {
                          method: "PATCH"
                        })
                          .then(res => {
                            if (!res.ok) throw new Error();
                            return res.json();
                          })
                          .then(() => {
                            alert("Converted to Order");
                            window.location.reload();
                          })
                          .catch(() => alert("Convert failed"));
                      }}
                    >
                      Convert to Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. ADD TOTAL AT BOTTOM */}
      {filteredOrders.length > 0 && !loading && (
        <div style={{
          marginTop: 20,
          textAlign: "right",
          fontWeight: "bold",
          fontSize: "16px"
        }}>
          Total: ₹ {filteredOrders
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
            .toLocaleString()}
        </div>
      )}
    </div>
  );
}