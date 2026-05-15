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
import EditItem from "./EditItem";
import ItemList from "./ItemList";
import QuotationList from "./QuotationList";
import QuotationView from "./QuotationView";
import QuotationPrint from "./QuotationPrint";
import OrderList from "./OrderList";
import OrderDetail from "./OrderDetail";
import OrderView from "./OrderView";
import OrderPrint from "./OrderPrint";
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
import ReadyOrders from "./pages/dispatch/ReadyOrders";
import DispatchForm from "./pages/dispatch/DispatchForm";
import DispatchList from "./pages/dispatch/DispatchList";
import DispatchOrdersPage from "./pages/dispatch/DispatchOrdersPage";
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
import DepartmentList from "./pages/boq/DepartmentList";
import InventoryPage              from "./pages/inventory/InventoryPage";
import PurchaseRequirementsPage    from "./pages/purchase-requirements/PurchaseRequirementsPage";
import ProductionExecutionPage    from "./pages/production-execution/ProductionExecutionPage";
import ManufacturingAnalyticsPage from "./pages/manufacturing/ManufacturingAnalyticsPage";
import VendorsPage                  from "./pages/vendors/VendorsPage";
import PurchaseOrdersPage         from "./pages/purchase-orders/PurchaseOrdersPage";
import PurchaseOrderDetailPage    from "./pages/purchase-orders/PurchaseOrderDetailPage";
import ServiceTicketsPage         from "./pages/service/ServiceTicketsPage";
import ServiceDashboardPage       from "./pages/service/ServiceDashboardPage";
import AmcContractsPage           from "./pages/service/AmcContractsPage";
import TechniciansPage            from "./pages/service/TechniciansPage";
import FinanceDashboardPage       from "./pages/finance/FinanceDashboardPage";
import CustomerPaymentsPage       from "./pages/finance/CustomerPaymentsPage";
import VendorPaymentsPage         from "./pages/finance/VendorPaymentsPage";
import HrDashboardPage             from "./pages/workforce/HrDashboardPage";
import WorkforceProfilesPage      from "./pages/workforce/WorkforceProfilesPage";
import AttendancePage             from "./pages/workforce/AttendancePage";
import LeaveRequestsPage          from "./pages/workforce/LeaveRequestsPage";
import ShiftMasterPage            from "./pages/workforce/ShiftMasterPage";

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
              <Route path="/orders/:id/view" element={<PrivateRoute><OrderView /></PrivateRoute>} />
              <Route path="/edit-order/:id" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
              <Route path="/pending-approval" element={<PrivateRoute><PendingApproval /></PrivateRoute>} />

              {/* Quotations */}
              <Route path="/quotation" element={<PrivateRoute><QuotationForm /></PrivateRoute>} />
              <Route path="/quotations" element={<PrivateRoute><QuotationList /></PrivateRoute>} />
              <Route path="/quotations/:id/view" element={<PrivateRoute><QuotationView /></PrivateRoute>} />

              {/* Customers */}
              <Route path="/customers" element={<PrivateRoute><CustomerList /></PrivateRoute>} />
              <Route path="/add-customer" element={<PrivateRoute><AddCustomer /></PrivateRoute>} />
              <Route path="/customer/create" element={<PrivateRoute><AddCustomer /></PrivateRoute>} />
              <Route path="/edit-customer/:id" element={<PrivateRoute><EditCustomer /></PrivateRoute>} />

              <Route path="/service/tickets/:id" element={<PrivateRoute><ServiceTicketsPage /></PrivateRoute>} />
              <Route path="/service/tickets" element={<PrivateRoute><ServiceTicketsPage /></PrivateRoute>} />
              <Route path="/service/dashboard" element={<PrivateRoute><ServiceDashboardPage /></PrivateRoute>} />
              <Route path="/service/amc" element={<PrivateRoute><AmcContractsPage /></PrivateRoute>} />
              <Route path="/service/technicians" element={<PrivateRoute><TechniciansPage /></PrivateRoute>} />

              {/* Items */}
              <Route path="/add-item" element={<PrivateRoute><AddItem /></PrivateRoute>} />
              <Route path="/edit-item/:id" element={<PrivateRoute><EditItem /></PrivateRoute>} />
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

              <Route path="/finance" element={<PrivateRoute><FinanceDashboardPage /></PrivateRoute>} />
              <Route path="/finance/customer-payments" element={<PrivateRoute><CustomerPaymentsPage /></PrivateRoute>} />
              <Route path="/finance/vendor-payments" element={<PrivateRoute><VendorPaymentsPage /></PrivateRoute>} />

              <Route path="/workforce/hr" element={<PermissionRoute permission="staff.view"><HrDashboardPage /></PermissionRoute>} />
              <Route path="/workforce/profiles" element={<PermissionRoute permission="staff.view"><WorkforceProfilesPage /></PermissionRoute>} />
              <Route path="/workforce/shifts" element={<PermissionRoute permission="staff.view"><ShiftMasterPage /></PermissionRoute>} />
              <Route path="/workforce/attendance" element={<PrivateRoute><AttendancePage /></PrivateRoute>} />
              <Route path="/workforce/leaves" element={<PrivateRoute><LeaveRequestsPage /></PrivateRoute>} />

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

              {/* Dispatch */}
              <Route path="/dispatch/orders/:id" element={<PrivateRoute><DispatchOrdersPage /></PrivateRoute>} />
              <Route path="/dispatch/orders" element={<PrivateRoute><DispatchOrdersPage /></PrivateRoute>} />
              <Route path="/dispatch" element={<PrivateRoute><ReadyOrders /></PrivateRoute>} />
              <Route path="/dispatch/create" element={<PrivateRoute><DispatchForm /></PrivateRoute>} />
              <Route path="/dispatch/list" element={<PrivateRoute><DispatchList /></PrivateRoute>} />

              {/* SLA */}
              <Route path="/sla" element={<PrivateRoute><SlaDashboard /></PrivateRoute>} />

              {/* Activity */}
              <Route path="/activity" element={<PrivateRoute><ActivityCenter /></PrivateRoute>} />

              {/* KPI */}
              <Route path="/kpi" element={<PrivateRoute><KpiDashboard /></PrivateRoute>} />

              {/* Manufacturing / BOQ */}
              <Route path="/departments" element={<PrivateRoute><DepartmentList /></PrivateRoute>} />

              {/* Inventory */}
              <Route path="/inventory"              element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
              <Route path="/purchase-requirements"    element={<PrivateRoute><PurchaseRequirementsPage /></PrivateRoute>} />
              <Route path="/vendors"                  element={<PrivateRoute><VendorsPage /></PrivateRoute>} />
              <Route path="/purchase-orders"          element={<PrivateRoute><PurchaseOrdersPage /></PrivateRoute>} />
              <Route path="/purchase-orders/:id"      element={<PrivateRoute><PurchaseOrderDetailPage /></PrivateRoute>} />
              <Route path="/production/execution"    element={<PrivateRoute><ProductionExecutionPage /></PrivateRoute>} />
              <Route path="/manufacturing/analytics"   element={<PrivateRoute><ManufacturingAnalyticsPage /></PrivateRoute>} />

              {/* Staff & Settings */}
              <Route path="/staff" element={<PermissionRoute permission="staff.view"><StaffManagement /></PermissionRoute>} />
              <Route path="/rbac" element={<PermissionRoute permission="rbac.manage"><RbacMatrix /></PermissionRoute>} />

              {/* Notification Center */}
              <Route path="/notifications" element={<PrivateRoute><NotificationCenter /></PrivateRoute>} />

              {/* Placeholder routes */}
              <Route path="/accounts" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/delivery" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

            </Route>

            {/* Print pages — outside Layout (no sidebar/navbar) */}
            <Route path="/quotations/:id/print" element={<PrivateRoute><QuotationPrint /></PrivateRoute>} />
            <Route path="/orders/:id/print" element={<PrivateRoute><OrderPrint /></PrivateRoute>} />

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
