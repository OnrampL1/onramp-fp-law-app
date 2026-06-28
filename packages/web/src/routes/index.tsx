import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { Settings } from "../pages/dashboard/Settings";
import { NotFound } from "../pages/NotFound";
import { PlaceholderPage } from "@/pages/dashboard/PlaceholderPage";
import Contracts from "@/pages/contracts/Contracts";
import ContractDetailPage from "@/pages/contracts/ContractDetails";
import { UploadContract } from "../pages/contracts/UploadContract";
import { PlaceholderPage } from "@/pages/dashboard/PlaceholderPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route
            path="/ai-analysis"
            element={
              <PlaceholderPage
                title="AI Analysis"
                description="Legal intelligence review"
              />
            }
          />
          <Route
            path="/investigator"
            element={
              <PlaceholderPage
                title="Clause Investigator"
                description="Search and compare clauses"
              />
            }
          />
          <Route
            path="/upload"
            element={
              <PlaceholderPage
                title="Contract Upload"
                description="Add documents for review"
              />
            }
          />
          <Route
            path="/users"
            element={
              <PlaceholderPage
                title="User Management"
                description="Manage workspace access"
              />
            }
          />
          <Route
            path="/witness"
            element={
              <PlaceholderPage
                title="Witness Workflow"
                description="Review signatures and attestations"
              />
            }
          />
          <Route
            path="/audit"
            element={
              <PlaceholderPage
                title="Audit Logging"
                description="Monitor system activity"
              />
            }
          />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
