import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { Login } from "../pages/auth/Login";
import { Register } from "../pages/auth/Register";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { Settings } from "../pages/dashboard/Settings";
import { NotFound } from "../pages/NotFound";
import { UploadContract } from "../pages/contracts/UploadContract";
import { PlaceholderPage } from "@/pages/dashboard/PlaceholderPage";
import { WitnessWorkflow } from "../pages/WitnessWorkflow";
import { WitnessReview } from "../pages/WitnessReview";
// import { PlaceholderPage } from "../pages/PlaceholderPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route path="/witness-review" element={<WitnessReview />} />
      <Route path="/witness/review" element={<WitnessReview />} />
      
      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/contracts"
            element={
              <PlaceholderPage
                title="Contracts"
                description="Contract repository"
              />
            }
          />
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
            path="/users"
            element={
              <PlaceholderPage
                title="User Management"
                description="Manage workspace access"
              />
            }
          />
          
          <Route path="/witness" element={<WitnessWorkflow />} />
          <Route path="/witness-workflow" element={<WitnessWorkflow />} />


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

          {/* Contract routes */}
          <Route path="/contracts" element={<PlaceholderPage />} />
          <Route path="/contracts/:id" element={<PlaceholderPage />} />

          {/* AI Insight routes */}
          <Route path="/insights/auto-renewal" element={<PlaceholderPage />} />
          <Route path="/insights/liability" element={<PlaceholderPage />} />
          <Route path="/insights/non-compete" element={<PlaceholderPage />} />
          <Route path="/insights/ip-assignment" element={<PlaceholderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
