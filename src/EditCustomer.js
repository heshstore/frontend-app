import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { theme } from "./theme";
import PageLayout from "./components/layout/PageLayout";

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    mobile1: "",
    mobile2: "",
    countryCode1: "+91",
    countryCode2: "+91",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    customerType: "",
    tag: "",
    creditLimit: ""
  });

  // ✅ LOAD CUSTOMER
  useEffect(() => {
    fetch(`https://backend-service-xady.onrender.com/customers/${id}`)
      .then(res => res.json())
      .then(data => {
        setForm({
          ...data,
          mobile1: data.mobile1?.slice(-10) || "",
          mobile2: data.mobile2?.slice(-10) || "",
          countryCode1: data.mobile1?.slice(0, -10) || "+91",
          countryCode2: data.mobile2?.slice(0, -10) || "+91"
        });
      })
      .catch(err => console.error(err));
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ FINAL SAFE SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      companyName: form.companyName,
      contactName: form.contactName,
      mobile1: form.countryCode1 + form.mobile1,
      mobile2: form.mobile2
        ? form.countryCode2 + form.mobile2
        : "",
      email: form.email,
      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      gstNumber: form.gstNumber,
      customerType: form.customerType,
      tag: form.tag,
      creditLimit: Number(form.creditLimit || 0)
    };

    try {
      const res = await fetch(`https://backend-service-xady.onrender.com/customers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log("RESPONSE:", data);

      if (!res.ok) {
        console.error(data);
        alert("Update failed ❌");
        return;
      }

      alert("Customer Updated ✅");
      navigate("/customers");

    } catch (err) {
      console.error(err);
      alert("Server error ❌");
    }
  };

  return (
    <PageLayout title="Edit Customer">
      <div style={{ background: theme.background, minHeight: "100vh" }}>
        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 600,
            margin: "20px auto",
            background: theme.card,
            padding: 20,
            borderRadius: 12
          }}
        >

          {/* INPUT FIELDS */}
          {[
            ["Company Name", "companyName"],
            ["Contact Person", "contactName"],
            ["Email", "email"],
            ["Address", "address"],
            ["City", "city"],
            ["State", "state"],
            ["Pincode", "pincode"],
            ["GST Number", "gstNumber"],
            ["Tag", "tag"],
            ["Credit Limit", "creditLimit"]
          ].map(([label, name]) => (
            <div key={name} style={{ marginBottom: 15 }}>
              <label>{label}</label>
              <input
                name={name}
                value={form[name] || ""}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`
                }}
              />
            </div>
          ))}

          {/* MOBILE 1 */}
          <div style={{ marginBottom: 15 }}>
            <label>Mobile 1 *</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                name="countryCode1"
                value={form.countryCode1}
                onChange={handleChange}
                style={{ width: 80 }}
              />
              <input
                name="mobile1"
                value={form.mobile1}
                onChange={handleChange}
                maxLength={10}
                placeholder="10 digit number"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* MOBILE 2 */}
          <div style={{ marginBottom: 15 }}>
            <label>Mobile 2</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                name="countryCode2"
                value={form.countryCode2}
                onChange={handleChange}
                style={{ width: 80 }}
              />
              <input
                name="mobile2"
                value={form.mobile2}
                onChange={handleChange}
                maxLength={10}
                placeholder="10 digit number"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* CUSTOMER TYPE */}
          <div style={{ marginBottom: 15 }}>
            <label>Customer Type</label>
            <select
              name="customerType"
              value={form.customerType}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 6,
                border: `1px solid ${theme.border}`
              }}
            >
              <option value="">Select</option>
              <option>Retailer</option>
              <option>Wholesaler</option>
              <option>Hospital</option>
              <option>Chain Store</option>
            </select>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 12,
              background: theme.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Update Customer
          </button>
        </form>
      </div>
    </PageLayout>
  );
}