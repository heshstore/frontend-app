import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import OrderForm from "./OrderForm";
import OrderList from "./OrderList";
import Invoice from "./Invoice";
import Login from "./Login";
import Dashboard from "./Dashboard";
import AddCustomer from "./AddCustomer";
import CustomerList from "./CustomerList";
import EditCustomer from "./EditCustomer";
import AddItem from "./AddItem";
import ItemList from "./ItemList";
import QuotationForm from "./QuotationForm";
import QuotationList from "./QuotationList";
import ShopifyItems from "./ShopifyItems";
import PendingApproval from "./PendingApproval";
import OrderFormPage from './OrderForm';

// 🔐 Check login
const isLoggedIn = () => {
  return localStorage.getItem("token");
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/add-customer" element={<AddCustomer />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/edit-customer/:id" element={<EditCustomer />} />

        <Route path="/" element={<OrderForm />} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/pending" element={<PendingApproval />} />
        <Route path="/invoice/:id" element={<Invoice />} />
        <Route path="/add-item" element={<AddItem />} />
        <Route path="/items" element={<ItemList />} />
        <Route path="/quotation" element={<QuotationForm />} />
        <Route path="/quotation-list" element={<QuotationList />} />
        <Route path="/shopify-items" element={<ShopifyItems />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* 🚀 STRICT PATCH: ADDED /create-order ROUTE */}
        <Route path="/create-order" element={<OrderFormPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={isLoggedIn() ? <OrderForm /> : <Login />}
        />

        <Route
          path="/orders"
          element={isLoggedIn() ? <OrderList /> : <Login />}
        />

        <Route
          path="/invoice/:id"
          element={isLoggedIn() ? <Invoice /> : <Login />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;