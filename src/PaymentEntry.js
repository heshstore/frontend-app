import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import { buttonStyle, inputStyle } from "./theme";
import { apiFetch } from "./utils/api";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT/RTGS"];

export default function PaymentEntry() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    amount: "",
    mode: "Cash",
    reference_no: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitted || loading) return;

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/orders/${orderId}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(form.amount),
          mode: form.mode,
          reference_no: form.reference_no,
          notes: form.notes,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        alert("Payment recorded successfully");
        navigate(`/invoice/${orderId}`);
      } else {
        const err = await res.json();
        alert(err.message || "Payment failed");
      }
    } catch (err) {
      alert("Payment failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Record Payment">
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
              Amount (₹) *
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              min="1"
              step="0.01"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
              Payment Mode *
            </label>
            <select
              name="mode"
              value={form.mode}
              onChange={handleChange}
              style={inputStyle}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
              Reference No.
            </label>
            <input
              type="text"
              name="reference_no"
              value={form.reference_no}
              onChange={handleChange}
              placeholder="Cheque no / UTR / UPI Ref"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional notes..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitted}
            style={{ ...buttonStyle, width: "100%", padding: "10px", fontSize: 15, opacity: (loading || submitted) ? 0.7 : 1 }}
          >
            {loading ? "Recording..." : submitted ? "Recorded" : "Record Payment"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
