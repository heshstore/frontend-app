import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { initGA, initGTM, trackPageView } from "./lib/analytics";

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
import AllLeadsView from "./crm/AllLeadsView";
import FollowUpView from "./crm/FollowUpView";
import AutomationSettings from "./crm/AutomationSettings";
import WhatsAppQR from "./whatsapp/WhatsAppQR";
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
import ToastContainer from "./components/ui/ToastContainer";
import Layout from "./components/layout/Layout";
import SlaDashboard from "./pages/sla/SlaDashboard";
import ActivityCenter from "./pages/activity/ActivityCenter";
import KpiDashboard from "./pages/kpi/KpiDashboard";
import DepartmentList from "./pages/boq/DepartmentList";
import InventoryPage              from "./pages/inventory/InventoryPage";
import PurchaseRequirementsPage    from "./pages/purchase-requirements/PurchaseRequirementsPage";
import ProductionExecutionPage    from "./pages/production-execution/ProductionExecutionPage";
import ProductionBoardPage             from "./pages/production/ProductionBoardPage";
import CentralProductionBoardPage     from "./pages/production/CentralProductionBoardPage";
import DepartmentWorkspacePage        from "./pages/production/DepartmentWorkspacePage";
import ManufacturingAnalyticsPage     from "./pages/manufacturing/ManufacturingAnalyticsPage";
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
import InvoiceListPage            from "./pages/finance/InvoiceListPage";
import InvoiceDetailPage          from "./pages/finance/InvoiceDetailPage";
import HrDashboardPage             from "./pages/workforce/HrDashboardPage";
import WorkforceProfilesPage      from "./pages/workforce/WorkforceProfilesPage";
import AttendancePage             from "./pages/workforce/AttendancePage";
import LeaveRequestsPage          from "./pages/workforce/LeaveRequestsPage";
import ShiftMasterPage            from "./pages/workforce/ShiftMasterPage";
import WaEngineDashboard          from "./pages/marketing/whatsapp/WaEngineDashboard";
import WaNumbers                  from "./pages/marketing/whatsapp/WaNumbers";
import WaQueue                    from "./pages/marketing/whatsapp/WaQueue";
import WaLogs                     from "./pages/marketing/whatsapp/WaLogs";
import WaInbox                    from "./pages/marketing/whatsapp/WaInbox";
import WaAnalytics                from "./pages/marketing/whatsapp/WaAnalytics";
import WaValidate                 from "./pages/marketing/whatsapp/WaValidate";
import WaCampaigns                from "./pages/marketing/whatsapp/WaCampaigns";
// WaAudience removed — route now redirects to /database/promotional
import WaTemplates                from "./pages/marketing/whatsapp/WaTemplates";
import WaDailyReport              from "./pages/marketing/whatsapp/WaDailyReport";
import WaGovernance               from "./pages/marketing/whatsapp/WaGovernance";
import PilotDashboard             from "./pages/marketing/whatsapp/PilotDashboard";
import AiPromotionDashboard       from "./pages/marketing/whatsapp/AiPromotionDashboard";
import PromoDatabase              from "./pages/database/PromoDatabase";
import SkipRecoveryDashboard      from "./pages/database/SkipRecoveryDashboard";
import VisitingCardReader         from "./pages/database/VisitingCardReader";
import OperationsLog              from "./pages/pilot/OperationsLog";
import DailyOps                  from "./pages/ops/DailyOps";
import CommissionPage             from "./pages/workforce/CommissionPage";
import VersionHistory             from "./pages/settings/VersionHistory";
import EnvironmentDashboard       from "./pages/settings/EnvironmentDashboard";
import SystemHealth               from "./pages/settings/SystemHealth";
import PerformanceMonitor         from "./pages/settings/PerformanceMonitor";

console.log('[FRONTEND_BUILD]', '2026-05-21-v2');

function PageTracker() {
  const location = useLocation();
  useEffect(() => { trackPageView(location.pathname + location.search); }, [location]);
  return null;
}

const BYPASS_AUTH = false;

/** Any authenticated user */
const PrivateRoute = ({ children }) => {
  if (BYPASS_AUTH) return children;
  const token = localStorage.getItem("access_token");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (token || isLoggedIn === "true") return children;
  return <Navigate to="/" replace />;
};

/**
 * Permission-gated route (matches sidebar + backend RBAC).
 * `permission` can be a single string or an array (any-of match).
 */
const PermissionRoute = ({ children, permission }) => {
  if (BYPASS_AUTH) return children;
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
  useEffect(() => { initGA(); initGTM(); }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <PageTracker />
          <ToastContainer />
          <Routes>

            <Route path="/" element={<Login />} />

            <Route element={<Layout />}>

              <Route path="/dashboard" element={
                <PermissionRoute permission={["order.view", "lead.view", "crm.analytics.self", "production.view", "payment.view", "invoice.view"]}>
                  <Dashboard />
                </PermissionRoute>
              } />

              <Route path="/order" element={<PermissionRoute permission="order.create"><OrderForm /></PermissionRoute>} />
              <Route path="/order-list" element={<PermissionRoute permission="order.view"><OrderList /></PermissionRoute>} />
              <Route path="/orders" element={<PermissionRoute permission="order.view"><OrderList /></PermissionRoute>} />
              <Route path="/orders/:id" element={<PermissionRoute permission="order.view"><OrderDetail /></PermissionRoute>} />
              <Route path="/orders/:id/view" element={<PermissionRoute permission="order.view"><OrderView /></PermissionRoute>} />
              <Route path="/edit-order/:id" element={<PermissionRoute permission="order.edit"><OrderForm /></PermissionRoute>} />
              <Route path="/pending-approval" element={<PermissionRoute permission="order.approve"><PendingApproval /></PermissionRoute>} />

              <Route path="/quotation" element={<PermissionRoute permission="quotation.create"><QuotationForm /></PermissionRoute>} />
              <Route path="/quotations" element={<PermissionRoute permission="quotation.view"><QuotationList /></PermissionRoute>} />
              <Route path="/quotations/:id/view" element={<PermissionRoute permission="quotation.view"><QuotationView /></PermissionRoute>} />

              <Route path="/customers" element={<PermissionRoute permission="customer.view"><CustomerList /></PermissionRoute>} />
              <Route path="/add-customer" element={<PermissionRoute permission="customer.create"><AddCustomer /></PermissionRoute>} />
              <Route path="/customer/create" element={<PermissionRoute permission="customer.create"><AddCustomer /></PermissionRoute>} />
              <Route path="/edit-customer/:id" element={<PermissionRoute permission="customer.view"><EditCustomer /></PermissionRoute>} />

              <Route path="/service/tickets/:id" element={<PermissionRoute permission="customer.view"><ServiceTicketsPage /></PermissionRoute>} />
              <Route path="/service/tickets" element={<PermissionRoute permission="customer.view"><ServiceTicketsPage /></PermissionRoute>} />
              <Route path="/service/dashboard" element={<PermissionRoute permission="customer.view"><ServiceDashboardPage /></PermissionRoute>} />
              <Route path="/service/amc" element={<PermissionRoute permission="customer.view"><AmcContractsPage /></PermissionRoute>} />
              <Route path="/service/technicians" element={<PermissionRoute permission="staff.view"><TechniciansPage /></PermissionRoute>} />

              <Route path="/add-item" element={<PermissionRoute permission="item.create"><AddItem /></PermissionRoute>} />
              <Route path="/edit-item/:id" element={<PermissionRoute permission="item.edit"><EditItem /></PermissionRoute>} />
              <Route path="/items" element={<PermissionRoute permission="item.view"><ItemList /></PermissionRoute>} />
              <Route path="/shopify-items" element={<PermissionRoute permission="item.view"><ShopifyItems /></PermissionRoute>} />

              <Route path="/invoice/:id" element={<PermissionRoute permission="invoice.view"><Invoice /></PermissionRoute>} />
              <Route path="/payment/:orderId" element={<PermissionRoute permission="payment.create"><PaymentEntry /></PermissionRoute>} />

              <Route path="/set-credit-limit" element={<PermissionRoute permission="customer.edit"><SetCreditLimit /></PermissionRoute>} />
              <Route path="/accounts/outstanding" element={<PermissionRoute permission={["payment.view", "invoice.view"]}><OutstandingOrders /></PermissionRoute>} />
              <Route path="/accounts/payment/:orderId" element={<PermissionRoute permission="payment.create"><PaymentForm /></PermissionRoute>} />
              <Route path="/accounts/history/:orderId" element={<PermissionRoute permission="payment.view"><PaymentHistory /></PermissionRoute>} />

              <Route path="/finance" element={<PermissionRoute permission="payment.view"><FinanceDashboardPage /></PermissionRoute>} />
              <Route path="/finance/customer-payments" element={<PermissionRoute permission="payment.view"><CustomerPaymentsPage /></PermissionRoute>} />
              <Route path="/finance/vendor-payments" element={<PermissionRoute permission="payment.view"><VendorPaymentsPage /></PermissionRoute>} />
              <Route path="/invoices" element={<PermissionRoute permission={["invoice.view", "payment.view"]}><InvoiceListPage /></PermissionRoute>} />
              <Route path="/invoice-view/:id" element={<PermissionRoute permission={["invoice.view", "payment.view"]}><InvoiceDetailPage /></PermissionRoute>} />

              <Route path="/workforce/hr" element={<PermissionRoute permission="staff.view"><HrDashboardPage /></PermissionRoute>} />
              <Route path="/workforce/profiles" element={<PermissionRoute permission="staff.view"><WorkforceProfilesPage /></PermissionRoute>} />
              <Route path="/workforce/shifts" element={<PermissionRoute permission="staff.view"><ShiftMasterPage /></PermissionRoute>} />
              <Route path="/workforce/attendance" element={<PrivateRoute><AttendancePage /></PrivateRoute>} />
              <Route path="/workforce/leaves" element={<PrivateRoute><LeaveRequestsPage /></PrivateRoute>} />

              <Route path="/crm/leads" element={<PermissionRoute permission="lead.view"><LeadList /></PermissionRoute>} />
              <Route path="/crm/leads/new" element={<PermissionRoute permission="lead.create"><LeadForm /></PermissionRoute>} />
              <Route path="/crm/leads/:id/edit" element={<PermissionRoute permission="lead.edit"><LeadForm /></PermissionRoute>} />
              <Route path="/crm/leads/:id" element={<PermissionRoute permission="lead.view"><LeadDetail /></PermissionRoute>} />
              <Route path="/crm/queue" element={<PermissionRoute permission="lead.view"><LeadQueue /></PermissionRoute>} />
              <Route path="/crm/all-leads" element={<PermissionRoute permission="lead.view"><AllLeadsView /></PermissionRoute>} />
              <Route path="/crm/analytics" element={<PermissionRoute permission={["crm.analytics.self", "crm.analytics.team", "crm.analytics.all"]}><CrmAnalytics /></PermissionRoute>} />
              <Route path="/crm/followups" element={<PermissionRoute permission="lead.view"><FollowUpView /></PermissionRoute>} />
              <Route path="/crm/automation-settings" element={<PermissionRoute permission="lead.edit"><AutomationSettings /></PermissionRoute>} />
              <Route path="/whatsapp" element={<PermissionRoute permission={["lead.view", "whatsapp.manage"]}><WhatsAppQR /></PermissionRoute>} />
              <Route path="/admin/whatsapp" element={<PermissionRoute permission="whatsapp.manage"><WhatsAppMonitor /></PermissionRoute>} />

              {/* ── Database group ── */}
              <Route path="/database/promotional"          element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><PromoDatabase /></PermissionRoute>} />
              <Route path="/database/skip-recovery"        element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><SkipRecoveryDashboard /></PermissionRoute>} />
              <Route path="/database/visiting-card"        element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><VisitingCardReader /></PermissionRoute>} />

              {/* ── WhatsApp Promotional Engine — canonical routes ── */}
              <Route path="/marketing/whatsapp" element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><WaEngineDashboard /></PermissionRoute>} />
              <Route path="/marketing/whatsapp/inbox" element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><WaInbox /></PermissionRoute>} />
              <Route path="/marketing/whatsapp/ai-campaigns" element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><AiPromotionDashboard /></PermissionRoute>} />
              <Route path="/marketing/whatsapp/campaigns" element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><WaCampaigns /></PermissionRoute>} />
              <Route path="/marketing/whatsapp/audience" element={<Navigate to="/database/promotional" replace />} />
              <Route path="/marketing/whatsapp/connections" element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><WaNumbers /></PermissionRoute>} />
              <Route path="/marketing/whatsapp/analytics" element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><WaAnalytics /></PermissionRoute>} />
              <Route path="/marketing/whatsapp/templates" element={<PermissionRoute permission={["whatsapp.manage", "lead.view"]}><WaTemplates /></PermissionRoute>} />

              {/* ── Legacy /marketing/whatsapp-engine/* — permanent redirects ── */}
              <Route path="/marketing/whatsapp-engine" element={<Navigate to="/marketing/whatsapp" replace />} />
              <Route path="/marketing/whatsapp-engine/inbox" element={<Navigate to="/marketing/whatsapp/inbox" replace />} />
              <Route path="/marketing/whatsapp-engine/ai-promotion" element={<Navigate to="/marketing/whatsapp/ai-campaigns" replace />} />
              <Route path="/marketing/whatsapp-engine/campaigns" element={<Navigate to="/marketing/whatsapp/campaigns" replace />} />
              <Route path="/marketing/whatsapp-engine/audience" element={<Navigate to="/marketing/whatsapp/audience" replace />} />
              <Route path="/marketing/whatsapp-engine/numbers" element={<Navigate to="/marketing/whatsapp/connections" replace />} />
              <Route path="/marketing/whatsapp-engine/analytics" element={<Navigate to="/marketing/whatsapp/analytics" replace />} />
              <Route path="/marketing/whatsapp-engine/templates" element={<Navigate to="/marketing/whatsapp/templates" replace />} />
              <Route path="/marketing/whatsapp-engine/queue" element={<Navigate to="/marketing/whatsapp/analytics" replace />} />
              <Route path="/marketing/whatsapp-engine/logs" element={<Navigate to="/marketing/whatsapp/analytics" replace />} />
              <Route path="/marketing/whatsapp-engine/daily-report" element={<Navigate to="/marketing/whatsapp/analytics" replace />} />
              <Route path="/marketing/whatsapp-engine/validate" element={<Navigate to="/marketing/whatsapp/connections" replace />} />
              <Route path="/marketing/whatsapp-engine/governance" element={<Navigate to="/marketing/whatsapp" replace />} />
              <Route path="/marketing/whatsapp-engine/pilot" element={<Navigate to="/marketing/whatsapp" replace />} />
              <Route path="/pilot/log" element={<PermissionRoute permission={["admin"]}><OperationsLog /></PermissionRoute>} />
              <Route path="/settings/system-health"  element={<PermissionRoute permission="rbac.manage"><SystemHealth /></PermissionRoute>} />
              <Route path="/settings/perf-monitor"   element={<PermissionRoute permission="rbac.manage"><PerformanceMonitor /></PermissionRoute>} />
              <Route path="/settings/version-history" element={<Navigate to="/settings/system-health" replace />} />
              <Route path="/settings/environment"     element={<Navigate to="/settings/system-health" replace />} />
              <Route path="/daily-ops" element={<PermissionRoute permission={["order.view"]}><DailyOps /></PermissionRoute>} />
              <Route path="/commission" element={<PermissionRoute permission="staff.view"><CommissionPage /></PermissionRoute>} />

              <Route path="/dispatch/orders/:id" element={<PermissionRoute permission="dispatch.view"><DispatchOrdersPage /></PermissionRoute>} />
              <Route path="/dispatch/orders" element={<PermissionRoute permission="dispatch.view"><DispatchOrdersPage /></PermissionRoute>} />
              <Route path="/dispatch" element={<PermissionRoute permission="dispatch.view"><ReadyOrders /></PermissionRoute>} />
              <Route path="/dispatch/create" element={<PermissionRoute permission="dispatch.create"><DispatchForm /></PermissionRoute>} />
              <Route path="/dispatch/list" element={<PermissionRoute permission="dispatch.view"><DispatchList /></PermissionRoute>} />

              <Route path="/sla" element={<PermissionRoute permission="staff.view"><SlaDashboard /></PermissionRoute>} />
              <Route path="/activity" element={<PermissionRoute permission="staff.view"><ActivityCenter /></PermissionRoute>} />
              <Route path="/kpi" element={<PermissionRoute permission="staff.view"><KpiDashboard /></PermissionRoute>} />

              <Route path="/departments" element={<PermissionRoute permission="production.view"><DepartmentList /></PermissionRoute>} />

              <Route path="/inventory" element={<PermissionRoute permission="inventory.view"><InventoryPage /></PermissionRoute>} />
              <Route path="/purchase-requirements" element={<PermissionRoute permission="inventory.view"><PurchaseRequirementsPage /></PermissionRoute>} />
              <Route path="/vendors" element={<PermissionRoute permission="inventory.view"><VendorsPage /></PermissionRoute>} />
              <Route path="/purchase-orders" element={<PermissionRoute permission="inventory.view"><PurchaseOrdersPage /></PermissionRoute>} />
              <Route path="/purchase-orders/:id" element={<PermissionRoute permission="inventory.view"><PurchaseOrderDetailPage /></PermissionRoute>} />
              <Route path="/production/board"           element={<PermissionRoute permission="production.view"><ProductionBoardPage /></PermissionRoute>} />
              <Route path="/production/central-board"   element={<PermissionRoute permission="production.view"><CentralProductionBoardPage /></PermissionRoute>} />
              <Route path="/production/dept-workspace"  element={<PermissionRoute permission="production.view"><DepartmentWorkspacePage /></PermissionRoute>} />
              <Route path="/production/execution"       element={<PermissionRoute permission="production.view"><ProductionExecutionPage /></PermissionRoute>} />
              <Route path="/manufacturing/analytics" element={<PermissionRoute permission="production.view"><ManufacturingAnalyticsPage /></PermissionRoute>} />

              <Route path="/staff" element={<PermissionRoute permission="staff.view"><StaffManagement /></PermissionRoute>} />
              <Route path="/rbac" element={<PermissionRoute permission="rbac.manage"><RbacMatrix /></PermissionRoute>} />


              <Route path="/accounts" element={<Navigate to="/dashboard" replace />} />
              <Route path="/delivery" element={<Navigate to="/dashboard" replace />} />

            </Route>

            <Route path="/quotations/:id/print" element={<PermissionRoute permission="quotation.view"><QuotationPrint /></PermissionRoute>} />
            <Route path="/orders/:id/print" element={<PermissionRoute permission="order.view"><OrderPrint /></PermissionRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
