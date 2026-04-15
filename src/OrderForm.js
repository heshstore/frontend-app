import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "./config";
import DocumentForm from "./components/forms/DocumentForm";

// ── Order-specific data loader ────────────────────────────────────────────────
// Maps the Order API response shape into the DocumentForm expected shape.
async function loadOrder(id) {
  const res  = await fetch(`${API_URL}/orders/${id}`);
  const data = await res.json();

  return {
    billTo:         { id: data.customer?.id || data.customer_id, companyName: data.customer_name },
    shipTo:         { id: data.customer?.id || data.customer_id, companyName: data.customer_name },
    shipSameAsBill: true,
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
      item_name:      it.item_name || it.itemName || "",
      qty:            it.quantity  || it.qty || 1,
      rate:           it.rate           || 0,
      discount_type:  it.discount_type  || "percent",
      discount_value: it.discount_value || "",
      gst_percent:    it.gst_percent || it.gst || 0,
      hsn_code:       it.hsn_code       || "",
      instruction:    it.instruction    || "",
      _floor_price:   it.rate           || 0,
      _image:         it.image          || "",
    })),
  };
}

// ── Order-specific submit handler ─────────────────────────────────────────────
async function submitOrder(payload, editId) {
  const res = await fetch(
    editId ? `${API_URL}/orders/${editId}` : `${API_URL}/orders`,
    { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  if (res.ok) {
    return { ok: true, message: editId ? "Order updated ✅" : "Order created ✅", redirect: "/orders" };
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
    />
  );
}
