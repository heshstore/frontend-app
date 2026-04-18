import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Dashboard from "./Dashboard";
import OrderForm from "./OrderForm";
import QuotationForm from "./QuotationForm";
import AddCustomer from "./AddCustomer";
import EditCustomer from "./EditCustomer";
import CustomerList from "./CustomerList";
import AddItem from "./AddItem";
import ItemList from "./ItemList";
import QuotationList from "./QuotationList";
import OrderList from "./OrderList";
import ShopifyItems from "./ShopifyItems";
import Invoice from "./Invoice";
import PendingApproval from "./PendingApproval";
import PaymentEntry from "./PaymentEntry";
import SetCreditLimit from "./SetCreditLimit";
import StaffManagement from "./StaffManagement";
import RbacMatrix from "./RbacMatrix";
import LeadList from "./crm/LeadList";
import LeadForm from "./crm/LeadForm";
import LeadDetail from "./crm/LeadDetail";
import TelecallerDashboard from "./crm/TelecallerDashboard";
import CrmAnalytics from "./crm/CrmAnalytics";
import WhatsAppQR from "./whatsapp/WhatsAppQR";
import { AuthProvider } from "./context/AuthContext";

/** Any authenticated user — used for public-ish protected pages (dashboard, etc.) */
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (token || isLoggedIn === "true") return children;
  return <Navigate to="/" replace />;
};

/**
 * Permission-gated route.
 * `permission` can be a single string or an array (any-of match).
 * Admin role always passes. Non-matching users are sent to /dashboard.
 */
const PermissionRoute = ({ children, permission }) => {
  const token = localStorage.getItem("access_token");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (!token && isLoggedIn !== "true") return <Navigate to="/" replace />;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role === "Admin") return children;
  } catch {}

  try {
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]");
    if (Array.isArray(perms)) {
      const required = Array.isArray(permission) ? permission : [permission];
      if (required.some((p) => perms.includes(p))) return children;
    }
  } catch {}

  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route path="/" element={<Login />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

          {/* Orders */}
          <Route path="/order" element={<PermissionRoute permission="order.create"><OrderForm /></PermissionRoute>} />
          <Route path="/order-list" element={<PermissionRoute permission="order.view"><OrderList /></PermissionRoute>} />
          <Route path="/orders" element={<PermissionRoute permission="order.view"><OrderList /></PermissionRoute>} />
          <Route path="/pending-approval" element={<PermissionRoute permission="order.view"><PendingApproval /></PermissionRoute>} />

          {/* Quotations */}
          <Route path="/quotation" element={<PermissionRoute permission="quotation.create"><QuotationForm /></PermissionRoute>} />
          <Route path="/quotations" element={<PermissionRoute permission="quotation.view"><QuotationList /></PermissionRoute>} />

          {/* Customers */}
          <Route path="/customers" element={<PermissionRoute permission="customer.view"><CustomerList /></PermissionRoute>} />
          <Route path="/add-customer" element={<PermissionRoute permission="customer.create"><AddCustomer /></PermissionRoute>} />
          <Route path="/customer/create" element={<PermissionRoute permission="customer.create"><AddCustomer /></PermissionRoute>} />
          <Route path="/edit-customer/:id" element={<PermissionRoute permission="customer.edit"><EditCustomer /></PermissionRoute>} />

          {/* Items */}
          <Route path="/add-item" element={<PermissionRoute permission="item.create"><AddItem /></PermissionRoute>} />
          <Route path="/items" element={<PermissionRoute permission="item.view"><ItemList /></PermissionRoute>} />
          <Route path="/shopify-items" element={<PermissionRoute permission="item.view"><ShopifyItems /></PermissionRoute>} />

          {/* Invoice */}
          <Route path="/invoice/:id" element={<PermissionRoute permission="invoice.view"><Invoice /></PermissionRoute>} />
          <Route path="/payment/:orderId" element={<PermissionRoute permission="payment.create"><PaymentEntry /></PermissionRoute>} />

          {/* Accounts */}
          <Route path="/set-credit-limit" element={<PermissionRoute permission="customer.edit"><SetCreditLimit /></PermissionRoute>} />

          {/* CRM */}
          <Route path="/crm/queue" element={<PermissionRoute permission="lead.view"><TelecallerDashboard /></PermissionRoute>} />
          <Route path="/crm/leads" element={<PermissionRoute permission="lead.view"><LeadList /></PermissionRoute>} />
          <Route path="/crm/leads/new" element={<PermissionRoute permission="lead.create"><LeadForm /></PermissionRoute>} />
          <Route path="/crm/leads/:id" element={<PermissionRoute permission="lead.view"><LeadDetail /></PermissionRoute>} />
          <Route path="/crm/analytics" element={<PermissionRoute permission="crm.analytics.self"><CrmAnalytics /></PermissionRoute>} />
          <Route path="/whatsapp" element={<PermissionRoute permission="whatsapp.manage"><WhatsAppQR /></PermissionRoute>} />

          {/* Staff & Settings */}
          <Route path="/staff" element={<PermissionRoute permission="staff.view"><StaffManagement /></PermissionRoute>} />
          <Route path="/rbac" element={<PermissionRoute permission="rbac.manage"><RbacMatrix /></PermissionRoute>} />

          {/* Placeholder routes */}
          <Route path="/accounts" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/delivery" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
