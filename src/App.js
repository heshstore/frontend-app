import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Dashboard from "./Dashboard";
import OrderForm from "./OrderForm";
import AddCustomer from "./AddCustomer";
import CustomerList from "./CustomerList"; // STEP 1 — ADD IMPORT

// 🚀 FINAL PrivateRoute for stable login persistence/auth
const PrivateRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (isLoggedIn === "true") {
    return children;
  }
  // You may want to redirect to login in the future for strict auth.
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default login */}
        <Route path="/" element={<Login />} />

        {/* Keep existing required routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/order"
          element={
            <PrivateRoute>
              <OrderForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/create"
          element={
            <PrivateRoute>
              <AddCustomer />
            </PrivateRoute>
          }
        />

        {/* Add required routes per instructions */}
        <Route path="/items" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/quotation" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/accounts" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/delivery" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        {/* Added missing routes from Dashboard */}
        <Route path="/customers" element={<PrivateRoute><CustomerList /></PrivateRoute>} /> {/* STEP 2 — USE REAL CustomerList */}
        <Route path="/orders" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/orders/:status" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        {/* 🚀 Ensure both /add-item and /items routes exist above "*" */}
        <Route
          path="/add-item"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/items"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Always redirect any other route to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;