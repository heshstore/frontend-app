import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";
import { apiFetch } from "./utils/api";

export default function AddItem() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    sku: "",
    itemName: "",
    hsnCode: "",
    gst: "",
    costPrice: "",
    sellingPrice: "",
    unit: "pcs"
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.sku) {
      alert("SKU required ❌");
      return false;
    }
    if (!form.itemName) {
      alert("Item Name required ❌");
      return false;
    }
    if (!form.sellingPrice) {
      alert("Selling Price required ❌");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const payload = {
        ...form,
        gst: Number(form.gst || 0),
        costPrice: Number(form.costPrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
      };

      console.log("SENDING 👉", payload);

      const res = await apiFetch(`/items`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // ✅ HANDLE RESPONSE PROPERLY
      if (!res.ok) {
        throw new Error("Failed to save item");
      }

      const data = await res.json();
      console.log("RESPONSE 👉", data);

      alert("Item Added ✅");

      // ✅ RESET FORM (IMPORTANT UX FIX)
      setForm({
        sku: "",
        itemName: "",
        hsnCode: "",
        gst: "",
        costPrice: "",
        sellingPrice: "",
        unit: "pcs"
      });

      navigate("/items");

    } catch (err) {
      console.error("ERROR ❌", err);
      alert("Error saving item ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: theme.background, minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: 15,
        background: theme.card
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            left: 15,
            background: theme.primary,
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            border: "none"
          }}
        >
          ←
        </button>

        <h3>Add Item</h3>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 500,
          margin: "20px auto",
          background: theme.card,
          padding: 20,
          borderRadius: 12
        }}
      >

        {[
          ["SKU", "sku"],
          ["Item Name", "itemName"],
        ].map(([label, name]) => (
          <div key={name} style={{ marginBottom: 15 }}>
            <label>{label}</label>
            <input
              name={name}
              value={form[name]}
              onChange={handleChange}
              required={name === "sku"}
              style={{ width: "100%", padding: 10, borderRadius: 6 }}
            />
          </div>
        ))}

        {/* HSN Code — max 8 digits */}
        <div style={{ marginBottom: 15 }}>
          <label>HSN Code</label>
          <input
            name="hsnCode"
            value={form.hsnCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 8);
              setForm((prev) => ({ ...prev, hsnCode: val }));
            }}
            maxLength={8}
            placeholder="Up to 8 digits"
            style={{ width: "100%", padding: 10, borderRadius: 6 }}
          />
        </div>

        {/* GST % — dropdown */}
        <div style={{ marginBottom: 15 }}>
          <label>Gst Tax</label>
          <select
            name="gst"
            value={form.gst}
            onChange={handleChange}
            style={{ width: "100%", padding: 10, borderRadius: 6 }}
          >
            <option value="">Select GST %</option>
            <option value="5">5%</option>
            <option value="18">18%</option>
          </select>
        </div>

        {[
          ["Cost Price", "costPrice"],
          ["Selling Price", "sellingPrice"],
        ].map(([label, name]) => (
          <div key={name} style={{ marginBottom: 15 }}>
            <label>{label}</label>
            <input
              name={name}
              value={form[name]}
              onChange={handleChange}
              style={{ width: "100%", padding: 10, borderRadius: 6 }}
            />
          </div>
        ))}

        {/* UNIT */}
        <div style={{ marginBottom: 15 }}>
          <label>Unit</label>
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="pcs">Pcs</option>
            <option value="box">Box</option>
            <option value="pack">Doz</option>
            <option value="pack">Pair</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            background: loading ? "#aaa" : theme.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          {loading ? "Saving..." : "Save Item"}
        </button>
      </form>
    </div>
  );
}