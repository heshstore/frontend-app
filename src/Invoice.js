import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "./utils/api";

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [creditBlock, setCreditBlock] = useState(null); // { outstanding, credit_limit }
  const [invoiceCreated, setInvoiceCreated] = useState(null); // { invoice_no, id }

  useEffect(() => {
    apiFetch(`/orders/${id}/split-invoice`)
      .then(res => res.json())
      .then(data => {
        setInvoice(data);
      });
  }, [id]);

  const handleCreateInvoice = async () => {
    setCreatingInvoice(true);
    try {
      const res = await apiFetch(`/invoice/from-order/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.blocked) {
        setCreditBlock({ outstanding: data.outstanding, credit_limit: data.credit_limit });
      } else if (data.ok || data.invoice_no || (data.invoice && data.invoice.invoice_no)) {
        const inv = data.invoice || data;
        setInvoiceCreated({ invoice_no: inv.invoice_no || data.invoice_no, id: inv.id || data.id });
      } else {
        alert(data.message || "Invoice creation failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Loading check
  if (!invoice) return <div>Loading...</div>;

  // Items from API response
  const items = invoice.items || [];
  const charges = invoice.charges || {};

  const packing = charges.packing || 0;
  const cartage = charges.cartage || 0;
  const forwarding = charges.forwarding || 0;
  const installation = charges.installation || 0;
  const loading = charges.loading || 0;

  // Calculation logic (kept structure, fix for GST handling)
  let subTotal = 0;
let taxable18 = 0;
let taxable5 = 0;

items.forEach(i => {
  const amount = i.quantity * i.rate;
  subTotal += amount;

  if (Number(i.gst) === 18) {
    taxable18 += amount;
  } else if (Number(i.gst) === 5) {
    taxable5 += amount;
  }
});

// charges
const productCharges = packing + cartage + forwarding;
const serviceCharges = installation + loading;

// charges → 18%
taxable18 += productCharges + serviceCharges;

// GST
const gst18 = (taxable18 * 18) / 100;
const gst5 = (taxable5 * 5) / 100;

// total
const grandTotal =
  subTotal +
  productCharges +
  serviceCharges +
  gst18 +
  gst5;

  return (
    <div className="invoice">
      {/* HEADER */}
      <div className="header">
        <div className="title">PROFORMA INVOICE</div>

        <div className="company">
          HESH OPTO LAB PRIVATE LIMITED
        </div>

        <div className="address">
          No 207 & 208, Sri Selvavinayagar Nagar, Alinjivakkam,<br/>
          Redhills, Chennai - 600052. Tamil Nadu, India.
        </div>

        <div>Email: heshstoreaccounts@hotmail.com</div>
        <div>Mobile No.: +91 93814 52555</div>
        <div className="gst">GST No.: 33AABCH5436K1ZM</div>
      </div>

      {/* BILLING */}
      <div className="billing">
        <div>
          <b>Billing to:</b><br/>
          {invoice.customer_name}
          {invoice.is_wholesaler !== undefined && (
            <span style={{
              marginLeft: 6,
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 8,
              background: invoice.is_wholesaler ? "#fef9c3" : "#dbeafe",
              color: invoice.is_wholesaler ? "#a16207" : "#1e40af",
            }}>
              {invoice.is_wholesaler ? "WHOLESALER" : "RETAILER"}
            </span>
          )}<br/>
          {invoice.address}<br/>
          {invoice.city} - {invoice.pincode}<br/>
          GST NO.: {invoice.gst_number}<br/>
          Phone: {invoice.mobile}
        </div>

        <div>
          <b>Delivery to:</b><br/>
          {invoice.customer_name}<br/>
          {invoice.address}<br/>
          Phone: {invoice.mobile}
        </div>

        <div>
          Sales Man: -<br/>
          PI No: {invoice.order_number}<br/>
          PI Date: {new Date().toLocaleDateString()}<br/>
          PI Validity: One Month
        </div>
      </div>

      {/* TABLE */}
      <table className="table">
        <thead>
          <tr>
            <th>Sr.No</th>
            <th>Item Photo</th>
            <th>Item No / Name / HSN</th>
            <th>Instructions</th>
            <th>GST</th>
            <th>Disc.</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, index) => {
            const amount = i.quantity * i.rate;
            return (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <img src="/placeholder.png" className="img" alt="item" />
                </td>
                <td className="left">
                  {/* SKU (optional) */}
                  {i.sku && <><b>{i.sku}</b><br/></>}

                  {/* NAME (main fix) */}
                  {i.item_name || "Item"}<br/>

                  {/* HSN */}
                  <span className="hsn">
                  HSN: {i.hsn_code || "-"}
                  </span>
                </td>
                <td>{i.instructions || "-"}</td>
                <td>{i.gst}%</td>
                <td>
                  {Number(i.discount_value) > 0
                    ? (i.discount_type === "percent" ? `${i.discount_value}%` : `₹${i.discount_value}`)
                    : "—"}
                </td>
                <td>{i.quantity}</td>
                <td>Rs. {i.rate}</td>
                <td>Rs. {amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* BOTTOM */}
      <div className="bottom">
        {/* LEFT */}
        <div className="left-box">
          <img src="/qr.png" className="qr" alt="qr" />

          <div className="bank">
            <b>Account Details:</b><br/>
            HESH OPTO LAB PRIVATE LIMITED<br/>
            BANK: KOTAK MAHINDRA BANK<br/>
            BRANCH: CHENNAI<br/>
            CURRENT ACC NO: 5811128721<br/>
            IFSC: KKBK0000464
          </div>

          <div className="delivery">
            <b>Delivery Instructions:</b><br/>
            Payment Type: To Pay<br/>
            Delivery Type: Door Delivery<br/>
            Delivery Instructions: -
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-box">
          <div>Sub Total Rs. {subTotal.toFixed(2)}</div>
          {packing > 0 && <div>(+) Packing Charges Rs. {packing}</div>}
          {cartage > 0 && <div>(+) Cartage Charges Rs. {cartage}</div>}
          {forwarding > 0 && <div>(+) Forwarding Charges Rs. {forwarding}</div>}
          {installation > 0 && <div>(+) Installation Charges Rs. {installation}</div>}
          {loading > 0 && <div>(+) Loading Charges Rs. {loading}</div>}

          <div className="gst-line">
            18% GST | On Rs. {taxable18.toFixed(2)} Rs. {gst18.toFixed(2)}
          </div>

          <div className="gst-line">
            5% GST | On Rs. {taxable5.toFixed(2)} Rs. {gst5.toFixed(2)}
          </div>

          <div className="total">
            Nett Amount Rs. {grandTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* TERMS */}
      <div className="terms">
        <b>Terms and Conditions</b><br/>
        1. Payment received does not attract interest.<br/>
        2. Delivery subject to full payment.<br/>
        3. Not responsible for transit damage.<br/>
        4. Subject to Chennai jurisdiction.<br/>
        5. Computer generated document.
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button className="print" onClick={() => window.print()} style={{ marginTop: 0 }}>
          Print
        </button>
        {!invoiceCreated && (
          <button
            onClick={handleCreateInvoice}
            disabled={creatingInvoice}
            style={{
              padding: "8px 18px",
              background: "#198754",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: creatingInvoice ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: creatingInvoice ? 0.7 : 1,
            }}
          >
            {creatingInvoice ? "Creating..." : "Create Invoice"}
          </button>
        )}
      </div>

      {/* INVOICE CREATED SUCCESS BANNER */}
      {invoiceCreated && (
        <div style={{
          marginTop: 12,
          background: "#d1e7dd",
          border: "1px solid #0f5132",
          borderRadius: 6,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <span style={{ color: "#0f5132", fontWeight: 600 }}>
            ✓ Invoice {invoiceCreated.invoice_no} created successfully!
          </span>
          {invoiceCreated.id && (
            <button
              onClick={() => navigate(`/invoice-view/${invoiceCreated.id}`)}
              style={{
                padding: "5px 12px",
                background: "#0f5132",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              View Invoice →
            </button>
          )}
        </div>
      )}

      {/* CREDIT BLOCK MODAL */}
      {creditBlock && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 10,
            padding: 28,
            width: "90%",
            maxWidth: 420,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#dc3545", marginBottom: 10 }}>
              🚫 Credit Limit Exceeded
            </div>
            <p style={{ margin: "0 0 16px", color: "#444", fontSize: 14 }}>
              This customer has exceeded their credit limit. Invoice cannot be created.
            </p>
            <div style={{
              background: "#fff5f5",
              border: "1px solid #f5c6cb",
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 14,
            }}>
              <div>Outstanding: <strong>₹{Number(creditBlock.outstanding).toLocaleString("en-IN")}</strong></div>
              <div>Credit Limit: <strong>₹{Number(creditBlock.credit_limit).toLocaleString("en-IN")}</strong></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setCreditBlock(null)}
                style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
              >
                Close
              </button>
              <button
                onClick={() => { setCreditBlock(null); navigate(`/orders/${id}/payment`); }}
                style={{ padding: "8px 16px", background: "#0066b3", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
              >
                Record Payment →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .invoice {
          width: 794px;
          margin: auto;
          font-family: Arial;
          font-size: 12px;
          color: #000;
        }

        .header {
          border-bottom: 2px solid #1e4f7a;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }

        .title {
          text-align: center;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .company {
          font-size: 18px;
          font-weight: bold;
        }

        .gst {
          font-weight: bold;
        }

        .billing {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #25679c;
        }

        .table th {
          background: #25679c;
          color: white;
          border: 1px solid #1e4f7a;
          padding: 6px;
        }

        .table td {
          border: 1px solid #1e4f7a;
          padding: 5px;
          text-align: center;
          vertical-align: top;
        }

        .left {
          text-align: left;
        }

        .img {
          width: 40px;
        }

        .hsn {
          font-size: 10px;
          color: #555;
        }

        .bottom {
          display: flex;
          margin-top: 12px;
        }

        .left-box {
          width: 50%;
        }

        .right-box {
          width: 50%;
          text-align: right;
        }

        .qr {
          width: 90px;
          margin-bottom: 5px;
        }

        .bank, .delivery {
          margin-top: 6px;
        }

        .gst-line {
          margin-top: 4px;
        }

        .total {
          font-size: 16px;
          font-weight: bold;
          margin-top: 6px;
        }

        .terms {
          margin-top: 12px;
          font-size: 10px;
        }

        .print {
          margin-top: 10px;
        }

        @media print {
          .print { display: none; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}