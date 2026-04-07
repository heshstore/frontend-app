import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function Invoice() {
  // All hooks at top
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    fetch(`https://backend-service-xady.onrender.com/orders/${id}/split-invoice`)
      .then(res => res.json())
      .then(data => {
        console.log("INVOICE DATA:", data);
        setInvoice(data);
      });
  }, [id]);

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
          {invoice.customer_name}<br/>
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
                <td>0</td>
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

          <div>Round Off Rs. 0.00</div>

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

      {/* PRINT */}
      <button className="print" onClick={() => window.print()}>
        Print
      </button>

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