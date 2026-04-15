import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "./config";
import DocumentForm from "./components/forms/DocumentForm";

// ── Quotation-specific data loader ───────────────────────────────────────────
// Returns the shape DocumentForm expects: { billTo, shipTo, shipSameAsBill, form, rows }
async function loadQuotation(id) {
  const res  = await fetch(`${API_URL}/quotations/${id}`);
  const data = await res.json();

  return {
    billTo:         { id: data.customer_id,  companyName: data.customer_name },
    shipTo:         { id: data.ship_to_id || data.customer_id, companyName: data.customer_name },
    shipSameAsBill: data.bill_to_id === data.ship_to_id,
    form: {
      salesman_id:          data.salesman_id          || "",
      validity_days:        data.validity_days         || 15,
      delivery_by:          data.delivery_by           || "",
      delivery_type:        data.delivery_type         || "Road",
      payment_type:         data.payment_type          || "Credit",
      delivery_instructions: data.delivery_instructions || "",
      charges_packing:      data.charges_packing      || "",
      charges_cartage:      data.charges_cartage      || "",
      charges_forwarding:   data.charges_forwarding   || "",
      charges_installation: data.charges_installation || "",
      charges_loading:      data.charges_loading      || "",
    },
    rows: (data.items || []).map(it => ({
      sku:            it.sku            || "",
      item_name:      it.item_name      || "",
      qty:            it.qty            || 1,
      rate:           it.rate           || 0,
      discount_type:  it.discount_type  || "percent",
      discount_value: it.discount_value || "",
      gst_percent:    it.gst_percent    || 0,
      hsn_code:       it.hsn_code       || "",
      instruction:    it.instruction    || "",
      _floor_price:   it.rate           || 0,
      _image:         "",
    })),
  };
}

// ── Quotation-specific submit handler ────────────────────────────────────────
async function submitQuotation(payload, editId) {
  const res = await fetch(
    editId ? `${API_URL}/quotations/${editId}` : `${API_URL}/quotations`,
    { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  if (res.ok) {
    return { ok: true, message: editId ? "Quotation updated ✅" : "Quotation created ✅", redirect: "/quotations" };
  }
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: err.message || "Failed to save quotation" };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function QuotationForm() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  // useCallback so DocumentForm's useEffect deps stay stable
  const loadData   = useCallback(loadQuotation, []);
  const onSubmit   = useCallback(submitQuotation, []);

  return (
    <DocumentForm
      pageTitle={editId ? "Edit Quotation" : "New Quotation"}
      editId={editId}
      loadData={loadData}
      onSubmit={onSubmit}
      submitLabel="Create Quotation ✓"
      updateLabel="Update Quotation ✓"
    />
  );
}
