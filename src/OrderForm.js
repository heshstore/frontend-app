import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "./utils/api";
import DocumentForm from "./components/forms/DocumentForm";

// Maps a document's stored payment_terms string back to the dropdown's own
// value shape — either one of the fixed option strings, or the "CREDIT"
// sentinel plus the parsed day count for the Wholesaler/manual-credit case.
function parsePaymentTerms(str) {
  const m = /^Credit for (\d+) days$/.exec(str || "");
  if (m) return { payment_terms: "CREDIT", credit_days: Number(m[1]) };
  return { payment_terms: str || "", credit_days: 15 };
}

// ── Order-specific data loader ────────────────────────────────────────────────
// Maps the Order API response shape into the DocumentForm expected shape.
async function loadOrder(id) {
  const res  = await apiFetch(`/orders/${id}`);
  const data = await res.json();

  const customerId = data.customer?.id || data.customer_id;
  let customer = null;
  if (customerId) {
    const cRes = await apiFetch(`/customers/${customerId}`);
    if (cRes.ok) customer = await cRes.json();
  }
  const paymentTerms = parsePaymentTerms(data.payment_terms);

  return {
    billTo:         { id: customerId, companyName: data.customer_name, isWholesaler: customer?.isWholesaler, creditLimit: customer?.creditLimit, credit_days: customer?.credit_days },
    shipTo:         { id: customerId, companyName: data.customer_name },
    shipSameAsBill: true,
    form: {
      salesman_id:          data.salesman_id          || "",
      validity_days:        data.validity_days         || 15,
      delivery_by:          data.delivery_by           || "",
      delivery_type:           data.delivery_type            || "",
      booking_at:              data.booking_at               || "",
      goods_sent_by:           data.goods_sent_by            || "",
      transport_payment_by:    data.transport_payment_by     || "",
      payment_terms:           paymentTerms.payment_terms,
      credit_days:             paymentTerms.credit_days,
      delivery_instructions:   data.delivery_instructions    || "",
      charges_packing:      data.charges_packing      || "",
      charges_cartage:      data.charges_cartage      || "",
      charges_forwarding:   data.charges_forwarding   || "",
      charges_installation: data.charges_installation || "",
      charges_loading:      data.charges_loading      || "",
      due_date:             data.due_date ? String(data.due_date).slice(0, 10) : "",
      po_number:            data.po_number            || "",
      po_document_url:      data.po_document_url      || "",
    },
    rows: (data.items || []).map(it => ({
      sku:            it.sku            || "",
      item_name:      it.item_name || it.itemName || "",
      qty:            it.quantity  || it.qty || 1,
      rate:           it.rate           || 0,
      discount_type:  it.discount_type  || "percent",
      discount_value: it.discount_value || "",
      gst_percent:    it.gst_percent || it.gst || 0,
      is_tax_inclusive: !!it.is_tax_inclusive,
      hsn_code:       it.hsn_code       || "",
      instruction:    it.instruction    || "",
      unit:           it.unit           || "",
      _floor_price:   it.rate           || 0,
      _image:         it.image          || "",
    })),
  };
}

// ── Order-specific submit handler ─────────────────────────────────────────────
async function submitOrder(payload, editId) {
  const res = await apiFetch(
    editId ? `/orders/${editId}` : `/orders`,
    { method: editId ? "PUT" : "POST", body: JSON.stringify(payload) }
  );
  if (res.ok) {
    const isDraft = payload?.status === 'DRAFT';
    const verb = editId ? (isDraft ? "saved as draft" : "updated") : (isDraft ? "saved as draft" : "created");
    return { ok: true, message: `Order ${verb} ✅`, redirect: "/orders" };
  }
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: err.message || "Failed to save order" };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrderForm() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const loadData = useCallback(loadOrder, []);
  const onSubmit = useCallback(submitOrder, []);

  return (
    <DocumentForm
      pageTitle={editId ? "Edit Order" : "New Order"}
      editId={editId}
      loadData={loadData}
      onSubmit={onSubmit}
      submitLabel="Create Order ✓"
      updateLabel="Update Order ✓"
      allowDraft
      docType="order"
    />
  );
}
