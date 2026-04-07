import React, { useState } from "react";
import { formatCustomer } from "./utils/formatCustomer";
import PageLayout from "./components/layout/PageLayout";

export default function QuotationForm() {
  const [customer, setCustomer] = useState(null);

  const [rows, setRows] = useState([
    { itemName: "", qty: 1, rate: 0 }
  ]);

  // ADD NEW ROW
  const addRow = () => {
    setRows([...rows, { itemName: "", qty: 1, rate: 0 }]);
  };

  // UPDATE ROW
  const updateRow = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  // CALCULATE TOTAL
  const total = rows.reduce(
    (sum, r) => sum + (r.qty * r.rate),
    0
  );

  return (
    <PageLayout title="Create Quotation">
      <div className="container">
        {/* CUSTOMER */}
        <div style={{ marginBottom: 20 }}>
          <label>Customer</label>
          <input
            placeholder="Search customer"
            className="input"
          />
        </div>

        {/* ITEMS */}
        <div>
          <h3>Items</h3>

          {rows.map((row, i) => (
            <div key={i} className="row">
              <input
                placeholder="Item"
                className="input"
                value={row.itemName}
                onChange={(e) =>
                  updateRow(i, "itemName", e.target.value)
                }
              />

              <input
                type="number"
                className="input"
                value={row.qty}
                onChange={(e) =>
                  updateRow(i, "qty", Number(e.target.value))
                }
              />

              <input
                type="number"
                className="input"
                value={row.rate}
                onChange={(e) =>
                  updateRow(i, "rate", Number(e.target.value))
                }
              />

              <div>
                ₹ {row.qty * row.rate}
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={addRow}>
            + Add Item
          </button>
        </div>

        {/* TOTAL */}
        <div className="total">
          Total: ₹ {total}
        </div>
      </div>
    </PageLayout>
  );
}