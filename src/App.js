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
import CrmAnalytics from "./crm/CrmAnalytics";
import WhatsAppQR from "./whatsapp/WhatsAppQR";
import { AuthProvider } from "./context/AuthContext";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (token || isLoggedIn === "true") {
    return children;
  }
  return <Navigate to="/" replace />;
};

/** Admin-only route — redirects to dashboard if not Admin */
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (!token && isLoggedIn !== "true") return <Navigate to="/" replace />;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role === "Admin") return children;
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
          <Route path="/order" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
          <Route path="/order-list" element={<PrivateRoute><OrderList /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
          <Route path="/pending-approval" element={<PrivateRoute><PendingApproval /></PrivateRoute>} />

          {/* Quotations */}
          <Route path="/quotation" element={<PrivateRoute><QuotationForm /></PrivateRoute>} />
          <Route path="/quotations" element={<PrivateRoute><QuotationList /></PrivateRoute>} />

          {/* Customers */}
          <Route path="/customers" element={<PrivateRoute><CustomerList /></PrivateRoute>} />
          <Route path="/add-customer" element={<PrivateRoute><AddCustomer /></PrivateRoute>} />
          <Route path="/customer/create" element={<PrivateRoute><AddCustomer /></PrivateRoute>} />
          <Route path="/edit-customer/:id" element={<PrivateRoute><EditCustomer /></PrivateRoute>} />

          {/* Items */}
          <Route path="/add-item" element={<PrivateRoute><AddItem /></PrivateRoute>} />
          <Route path="/items" element={<PrivateRoute><ItemList /></PrivateRoute>} />
          <Route path="/shopify-items" element={<PrivateRoute><ShopifyItems /></PrivateRoute>} />

          {/* Invoice */}
          <Route path="/invoice/:id" element={<PrivateRoute><Invoice /></PrivateRoute>} />
          <Route path="/payment/:orderId" element={<PrivateRoute><PaymentEntry /></PrivateRoute>} />

          {/* Accounts */}
          <Route path="/set-credit-limit" element={<PrivateRoute><SetCreditLimit /></PrivateRoute>} />

          {/* CRM */}
          <Route path="/crm/leads" element={<PrivateRoute><LeadList /></PrivateRoute>} />
          <Route path="/crm/leads/new" element={<PrivateRoute><LeadForm /></PrivateRoute>} />
          <Route path="/crm/leads/:id" element={<PrivateRoute><LeadDetail /></PrivateRoute>} />
          <Route path="/crm/analytics" element={<PrivateRoute><CrmAnalytics /></PrivateRoute>} />
          <Route path="/whatsapp" element={<PrivateRoute><WhatsAppQR /></PrivateRoute>} />

          {/* Staff & Settings — Admin only */}
          <Route path="/staff" element={<AdminRoute><StaffManagement /></AdminRoute>} />
          <Route path="/rbac" element={<AdminRoute><RbacMatrix /></AdminRoute>} />

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
