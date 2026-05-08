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
import QuotationView from "./QuotationView";
import QuotationPrint from "./QuotationPrint";
import OrderList from "./OrderList";
import OrderDetail from "./OrderDetail";
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
import LeadQueue from "./crm/LeadQueue";
import FollowUpView from "./crm/FollowUpView";
import AutomationSettings from "./crm/AutomationSettings";
import WhatsAppQR from "./whatsapp/WhatsAppQR";
import NotificationCenter from "./pages/notifications/NotificationCenter";
import WhatsAppMonitor from "./pages/admin/WhatsAppMonitor";
import MyJobs from "./pages/MyJobs";
import ProductionQueue from "./pages/ProductionQueue";
import JobDetail from "./pages/JobDetail";
import ReadyOrders from "./pages/dispatch/ReadyOrders";
import DispatchForm from "./pages/dispatch/DispatchForm";
import DispatchList from "./pages/dispatch/DispatchList";
import OutstandingOrders from "./pages/accounts/OutstandingOrders";
import PaymentForm from "./pages/accounts/PaymentForm";
import PaymentHistory from "./pages/accounts/PaymentHistory";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import GlobalNotifications from "./components/GlobalNotifications";
import NotificationPanel from "./components/NotificationPanel";
import ToastContainer from "./components/ui/ToastContainer";
import Layout from "./components/layout/Layout";
import SlaDashboard from "./pages/sla/SlaDashboard";
import ActivityCenter from "./pages/activity/ActivityCenter";
import KpiDashboard from "./pages/kpi/KpiDashboard";

const BYPASS_AUTH = true; // DEBUG: set to false once auth is confirmed working

/** Any authenticated user — used for public-ish protected pages (dashboard, etc.) */
const PrivateRoute = ({ children }) => {
  if (BYPASS_AUTH) return children;

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
      <NotificationProvider>
        <BrowserRouter>
          <GlobalNotifications />
          <NotificationPanel />
          <ToastContainer />
          <Routes>

            {/* Login — no layout */}
            <Route path="/" element={<Login />} />

            {/* All authenticated routes — rendered inside Layout via <Outlet /> */}
            <Route element={<Layout />}>

              {/* Dashboard */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

              {/* Orders */}
              <Route path="/order" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
              <Route path="/order-list" element={<PrivateRoute><OrderList /></PrivateRoute>} />
              <Route path="/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
              <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
              <Route path="/edit-order/:id" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
              <Route path="/pending-approval" element={<PrivateRoute><PendingApproval /></PrivateRoute>} />

              {/* Quotations */}
              <Route path="/quotation" element={<PrivateRoute><QuotationForm /></PrivateRoute>} />
              <Route path="/quotations" element={<PrivateRoute><QuotationList /></PrivateRoute>} />
              <Route path="/quotations/:id/view" element={<PrivateRoute><QuotationView /></PrivateRoute>} />
              <Route path="/quotations/:id/print" element={<PrivateRoute><QuotationPrint /></PrivateRoute>} />

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
              <Route path="/accounts/outstanding" element={<PrivateRoute><OutstandingOrders /></PrivateRoute>} />
              <Route path="/accounts/payment/:orderId" element={<PrivateRoute><PaymentForm /></PrivateRoute>} />
              <Route path="/accounts/history/:orderId" element={<PrivateRoute><PaymentHistory /></PrivateRoute>} />

              {/* CRM */}
              <Route path="/crm/leads" element={<PrivateRoute><LeadList /></PrivateRoute>} />
              <Route path="/crm/leads/new" element={<PrivateRoute><LeadForm /></PrivateRoute>} />
              <Route path="/crm/leads/:id" element={<PrivateRoute><LeadDetail /></PrivateRoute>} />
              <Route path="/crm/queue" element={<PrivateRoute><LeadQueue /></PrivateRoute>} />
              <Route path="/crm/analytics" element={<PrivateRoute><CrmAnalytics /></PrivateRoute>} />
              <Route path="/crm/followups" element={<PrivateRoute><FollowUpView /></PrivateRoute>} />
              <Route path="/crm/automation-settings" element={<PrivateRoute><AutomationSettings /></PrivateRoute>} />
              <Route path="/whatsapp" element={<PrivateRoute><WhatsAppQR /></PrivateRoute>} />
              <Route path="/admin/whatsapp" element={<PermissionRoute permission="whatsapp.manage"><WhatsAppMonitor /></PermissionRoute>} />

              {/* Production */}
              <Route path="/production/my-jobs" element={<PrivateRoute><MyJobs /></PrivateRoute>} />
              <Route path="/production/queue" element={<PrivateRoute><ProductionQueue /></PrivateRoute>} />
              <Route path="/production/jobs/:id" element={<PrivateRoute><JobDetail /></PrivateRoute>} />

              {/* Dispatch */}
              <Route path="/dispatch" element={<PrivateRoute><ReadyOrders /></PrivateRoute>} />
              <Route path="/dispatch/create" element={<PrivateRoute><DispatchForm /></PrivateRoute>} />
              <Route path="/dispatch/list" element={<PrivateRoute><DispatchList /></PrivateRoute>} />

              {/* SLA */}
              <Route path="/sla" element={<PrivateRoute><SlaDashboard /></PrivateRoute>} />

              {/* Activity */}
              <Route path="/activity" element={<PrivateRoute><ActivityCenter /></PrivateRoute>} />

              {/* KPI */}
              <Route path="/kpi" element={<PrivateRoute><KpiDashboard /></PrivateRoute>} />

              {/* Staff & Settings */}
              <Route path="/staff" element={<PermissionRoute permission="staff.view"><StaffManagement /></PermissionRoute>} />
              <Route path="/rbac" element={<PermissionRoute permission="rbac.manage"><RbacMatrix /></PermissionRoute>} />

              {/* Notification Center */}
              <Route path="/notifications" element={<PrivateRoute><NotificationCenter /></PrivateRoute>} />

              {/* Placeholder routes */}
              <Route path="/accounts" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/delivery" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

            </Route>

            {/* Debug route — outside Layout, no auth */}
            <Route path="/test" element={<div style={{ padding: 20, fontSize: 18 }}>TEST PAGE WORKS</div>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
