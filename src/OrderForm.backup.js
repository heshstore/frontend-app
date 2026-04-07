import React, { useEffect, useState } from "react";
import axios from "axios";
import { theme } from "./theme";
import { formatCustomer } from "./utils/formatCustomer";

// Usage note: The only fetch you should add (related to split-invoice) is:
// fetch(`https://backend-service-xady.onrender.com/orders/${id}/split-invoice`)
// Any previous fetch to split-invoice (localhost or cloud) should be removed.

export default function OrderForm() {
  const [items, setItems] = useState([]);
  const [itemResults, setItemResults] = useState([]);

  const [rows, setRows] = useState([
    { sku: "", itemName: "", qty: 1, rate: 0, gst: 0 }
  ]);

  const [searchIndex, setSearchIndex] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);

  const [packing, setPacking] = useState(0);
  const [cartage, setCartage] = useState(0);
  const [forwarding, setForwarding] = useState(0);
  const [installation, setInstallation] = useState(0);
  const [loading, setLoading] = useState(0);

  // ------- CUSTOMER SEARCH STATE --------
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerList, setCustomerList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // form state to auto-fill on customer selection
  const [form, setForm] = useState({
    customer_name: "",
    mobile: "",
    city: "",
    address: ""
  });

  // Store the customer object - used to send only the ID
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [itemSearch, setItemSearch] = useState("");

  // ✅ LOAD ITEMS
  useEffect(() => {
    fetch("https://backend-service-xady.onrender.com/items")
      .then(res => res.json())
      .then(data => setItems(data || []));
  }, []);

  // ✅ ITEM SEARCH
  useEffect(() => {
    if (itemSearch.length < 2) return;

    const fetchItems = async () => {
      const res = await fetch(
        `https://backend-service-xady.onrender.com/items/search?q=${itemSearch}`
      );
      const data = await res.json();
      setItemResults(data || []);
    };

    fetchItems();
  }, [itemSearch]);

  // ------- CUSTOMER SEARCH FUNCTION --------
  const searchCustomers = async (value) => {
    setCustomerSearch(value);

    if (!value) {
      setCustomerList([]);
      return;
    }

    try {
      const res = await axios.get(
        `https://backend-service-xady.onrender.com/customers?search=${value}`
      );
      setCustomerList(res.data);
      setShowDropdown(true);
    } catch (err) {
      console.error("Customer search error", err);
    }
  };

  // ------- HIDE DROPDOWN ON OUTSIDE CLICK --------
  useEffect(() => {
    const handleClick = () => setShowDropdown(false);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ✅ SKU SEARCH
  const handleSearch = (value, index) => {
    setSearchText(value);
    setSearchIndex(index);

    const updated = [...rows];
    updated[index].sku = value;
    setRows(updated);

    if (!value) {
      setFilteredItems([]);
      return;
    }

    const filtered = items.filter(i =>
      i?.sku?.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredItems(filtered);
  };

  // ✅ SELECT ITEM
  const selectItem = (item, index) => {
    const updated = [...rows];

    updated[index] = {
      ...updated[index],
      sku: item.sku,
      itemName: item.itemName,
      rate: item.sellingPrice,
      gst: item.gst
    };

    // Add item.id to row as per instruction
    updated[index].id = item.id;

    setRows(updated);
    setItemResults([]);
    setItemSearch("");
  };

  // ✅ CHANGE FIELD
  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  // ✅ ADD ROW
  const addRow = () => {
    setRows([
      ...rows,
      { sku: "", itemName: "", qty: 1, rate: 0, gst: 0 }
    ]);
  };

  // ✅ CALCULATIONS
  const calculate = (row) => {
    const amount = row.qty * row.rate;
    const gstAmount = (amount * row.gst) / 100;
    const total = amount + gstAmount;

    return { amount, gstAmount, total };
  };

  const totals = rows.reduce(
    (acc, row) => {
      const { amount, gstAmount } = calculate(row);
      acc.subtotal += amount;
      acc.gst += gstAmount;
      return acc;
    },
    { subtotal: 0, gst: 0 }
  );

  const grandTotal = totals.subtotal + totals.gst;

  // ✅ SAVE ORDER
  const handleSubmit = async () => {
    try {
      const payload = {
        customer_id: selectedCustomer?.id || 1, // changed line per instruction
        // Only send customer_id. Do not send customer_name here.
        customer_name: undefined,
        mobile: form.mobile || "9999999999",

        items: rows.map(r => ({
          item_id: items.find(i => i.sku === r.sku)?.id,
          itemName: r.itemName || r.sku || "Item",
          qty: Number(r.qty),
          price: Number(r.rate),
        })),

        charges: {
          packing: Number(packing || 0),
          cartage: Number(cartage || 0),
          forwarding: Number(forwarding || 0),
          installation: Number(installation || 0),
          loading: Number(loading || 0),
        },

        gst_percentage: 18,
        gst_split_percent: 100,
      };

      const res = await fetch("https://backend-service-xady.onrender.com/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      const orderId = data?.id;

      if (orderId) {
        alert("Order Saved ✅ ID: " + orderId);
      } else {
        alert("Saved but ID missing ❌");
      }

      // EXAMPLE: If you want to use split-invoice endpoint after order creation, use ONLY this:
      // fetch(`https://backend-service-xady.onrender.com/orders/${orderId}/split-invoice`)
    } catch (err) {
      console.error(err);
      alert("Error saving order ❌");
    }
  };

  return (
    <div className="order-container">
      <div className="page-header">
        <div className="back">← Back</div>
        <h1>Create Order</h1>
        <div className="underline"></div>
      </div>
      {/* ===== Top Section: Like Quotation ===== */}
      <div className="form-section">
        <label>Customer</label>
        <input
          className="input"
          placeholder="Search customer"
          type="text"
          value={customerSearch}
          onChange={(e) => searchCustomers(e.target.value)}
          onFocus={() => setShowDropdown(true)}
        />

        {showDropdown && customerList.length > 0 && (
          <div style={{
            border: "1px solid #ccc",
            maxHeight: "150px",
            overflowY: "auto",
            background: "#fff",
            position: "absolute",
            width: "100%",
            zIndex: 10
          }}>
            {customerList.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "8px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee"
                }}
                onClick={() => {
                  setCustomerSearch(c.companyName);
                  setShowDropdown(false);

                  // AUTO FILL FORM
                  setForm({
                    ...form,
                    customer_name: c.companyName,
                    contact_name: c.contactName,
                    mobile: c.mobile1,
                    city: c.city,
                    address: c.address
                  });
                  // Store entire customer object for ID reference,
                  // but DO NOT send name during submit, only ID
                  setSelectedCustomer(c);
                }}
              >
                <div>
                  <div style={{ fontWeight: "500" }}>
                    {formatCustomer({
                      companyName: c.companyName || c.name,
                      tag: c.tag,
                      city: c.city
                    })}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {c.contactName} | {c.mobile1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Items Section ===== */}
      <h2>Items</h2>
      <div className="items-section">
        <div className="card">
          {rows.map((row, index) => {
            const calc = calculate(row);

            return (
              <div key={index} style={{
                background: theme.card,
                padding: 10,
                marginBottom: 10,
                borderRadius: 8,
                position: "relative"
              }}>

                {/* ITEM SEARCH */}
                <input
                  type="text"
                  placeholder="Search Item"
                  className="input"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />

                {itemResults.length > 0 && (
                  <div style={{ border: "1px solid #ccc", background: "#fff" }}>
                    {itemResults.map((item) => (
                      <div
                        key={item.id}
                        style={{ padding: "8px", cursor: "pointer" }}
                        onClick={() => selectItem(item, index)}
                      >
                        {item.itemName} ({item.sku})
                      </div>
                    ))}
                  </div>
                )}

                <div>{row.itemName}</div>

                {/* QTY + RATE */}
                <input
                  type="number"
                  className="input"
                  value={row.qty}
                  onChange={(e) =>
                    handleChange(index, "qty", Number(e.target.value))
                  }
                />

                <input
                  type="number"
                  className="input"
                  value={row.rate}
                  onChange={(e) =>
                    handleChange(index, "rate", Number(e.target.value))
                  }
                />

                <div>₹ {calc.total.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Buttons (Below Items) ===== */}
      <button className="btn-primary" onClick={addRow}>+ Add Item</button>

      <h3>Total: ₹ {grandTotal.toFixed(2)}</h3>

      <button className="btn-primary" onClick={handleSubmit}>Save Order</button>
    </div>
  );
}