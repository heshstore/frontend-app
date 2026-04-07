import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";
import PageLayout from "./components/layout/PageLayout";
import { formatCustomer } from "./utils/formatCustomer";

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const perPage = 50;

  const loadCustomers = async () => {
    try {
      const res = await fetch("https://backend-service-xady.onrender.com/customers");
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete this customer?")) return;

    try {
      await fetch(`https://backend-service-xady.onrender.com/customers/${id}`, {
        method: "DELETE",
      });

      alert("Deleted successfully");
      loadCustomers();
    } catch (err) {
      alert("Delete failed");
    }
  };

  // ✅ SEARCH
  const filtered = customers.filter((c) =>
    Object.values(c)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const toggleExpand = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <PageLayout
      title="Customer Master"
      subtitle={`${customers.length} Customers`}
      onSearch={setSearch}
    >
      <div style={{ background: theme.background, minHeight: "100vh" }}>
        <div style={{
          maxWidth: 700,
          margin: "20px auto",
          padding: "0 10px"
        }}>
          {/* LIST */}
          {paginated.map((customer) => {
            // STEP 1: ADD DEBUG LOG
            console.log("CUSTOMER DATA:", customer);

            return (
              <div
                key={customer.id}
                style={{
                  background: theme.card,
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 14,
                  border: `1px solid ${theme.border}`,
                  cursor: "pointer"
                }}
              >
                {/* COLLAPSED */}
                <div
                  onClick={() => toggleExpand(customer.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 16 }}>
                      {formatCustomer({
                        companyName: customer.companyName || customer.name,
                        tag: customer.tag,
                        city: customer.city
                      })}
                    </div>

                    {/* ✅ FIXED HEADER */}
                    <div style={{ fontSize: 13, color: "#555" }}>
                      🏷 {customer.tag || "-"} | 🏢 {customer.customerType || "-"} | 📍 {customer.city || "-"}
                    </div>
                  </div>

                  <div>{expanded === customer.id ? "▲" : "▼"}</div>
                </div>

                {/* EXPANDED */}
                {expanded === customer.id && (
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    <div style={{ marginTop: 12, lineHeight: 1.6 }}>
                      {/* PHONE + EMAIL GROUP */}
                      <div style={{ marginBottom: 6 }}>
                        📞 {customer.mobile1?.replace("+91", "") || "-"}
                        {customer.mobile2 ? ` / ${customer.mobile2.replace("+91", "")}` : ""}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        ✉ {customer.email || "-"}
                      </div>

                      {/* ADDRESS GROUP */}
                      <div style={{ marginBottom: 6 }}>
                        📍 {customer.address || "-"}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        📍 {customer.city || "-"} - {customer.state || "-"} - {customer.pincode || "-"}
                      </div>

                      {/* BUSINESS INFO GROUP */}
                      <div style={{ marginBottom: 6 }}>
                        🏷 Tag: {customer.tag || "-"}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        🏢 Customer Type: {customer.customerType || "-"}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        🧾 GST: {customer.gstNumber ? customer.gstNumber : "Not Registered"}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        💰 Credit Limit: ₹ {customer.creditLimit ?? 0}
                      </div>

                      {/* ACTIONS */}
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          marginTop: 16
                        }}
                      >
                        <button
                          onClick={() => navigate(`/edit-customer/${customer.id}`)}
                          style={{
                            flex: 1,
                            background: "#06B6D4",
                            color: "#fff",
                            border: "none",
                            padding: "12px 0",
                            borderRadius: 8,
                            cursor: "pointer"
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteCustomer(customer.id)}
                          style={{
                            flex: 1,
                            background: "#EF4444",
                            color: "#fff",
                            border: "none",
                            padding: "12px 0",
                            borderRadius: 8,
                            cursor: "pointer"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* PAGINATION */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginTop: 20
            }}
          >
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer"
              }}
            >
              Prev
            </button>

            <span style={{ margin: "0 12px" }}>
              Page {page} / {totalPages || 1}
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer"
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}