import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "./config";
import { apiFetch } from "./utils/api";
import DocumentForm from "./components/forms/DocumentForm";

// ── Quotation-specific data loader ───────────────────────────────────────────
// Supports sentinel id "_prefill_<customerId>" to prefill customer from CRM lead flow
async function loadQuotation(id) {
  if (!id) return null;

  // Prefill from customer (coming from lead conversion)
  if (String(id).startsWith("_prefill_")) {
    const custId = String(id).replace("_prefill_", "");
    const res = await apiFetch(`/customers/${custId}`);
    if (!res.ok) return null;
    const c = await res.json();
    return {
      billTo:         { id: c.id, companyName: c.companyName },
      shipTo:         { id: c.id, companyName: c.companyName },
      shipSameAsBill: true,
      form: {
        salesman_id: "", validity_days: 15, delivery_by: "",
        delivery_type: "Road", payment_type: "Credit",
        delivery_instructions: "", charges_packing: "",
        charges_cartage: "", charges_forwarding: "",
        charges_installation: "", charges_loading: "",
      },
      rows: [],
    };
  }

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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function QuotationForm() {
  const [searchParams] = useSearchParams();
  const editId     = searchParams.get("id");
  const customerId = searchParams.get("customerId");
  const leadId     = searchParams.get("leadId");

  // When coming from lead conversion, use sentinel to trigger customer prefill
  const effectiveEditId = editId || (customerId ? `_prefill_${customerId}` : null);

  const loadData = useCallback(loadQuotation, []);

  const onSubmit = useCallback(async (payload, id) => {
    // Strip sentinel prefix — this is a new quotation
    const isNew = !id || String(id).startsWith("_prefill_");
    const res = await fetch(
      isNew ? `${API_URL}/quotations` : `${API_URL}/quotations/${id}`,
      { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    if (res.ok) {
      const saved = await res.json().catch(() => ({}));
      // Mark lead as QUOTATION stage if coming from CRM
      if (leadId && saved?.id) {
        apiFetch(`/crm/leads/${leadId}`, {
          method: "PUT",
          body: JSON.stringify({ status: "QUOTATION", quotation_id: saved.id }),
        }).catch(() => {});
      }
      return { ok: true, message: isNew ? "Quotation created ✅" : "Quotation updated ✅", redirect: "/quotations" };
    }
    const err = await res.json().catch(() => ({}));
    return { ok: false, message: err.message || "Failed to save quotation" };
  }, [leadId]);

  return (
    <DocumentForm
      pageTitle={effectiveEditId ? (editId ? "Edit Quotation" : "New Quotation (from Lead)") : "New Quotation"}
      editId={effectiveEditId}
      loadData={loadData}
      onSubmit={onSubmit}
      submitLabel="Create Quotation ✓"
      updateLabel="Update Quotation ✓"
    />
  );
}
