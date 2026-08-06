import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { Login } from "../pages/auth/Login";
import { AcceptInvitation } from "../pages/auth/AcceptInvitation";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { Settings } from "../pages/dashboard/Settings";
import { NotFound } from "../pages/NotFound";
import Contracts from "@/pages/contracts/Contracts";
import ContractDetailPage from "@/pages/contracts/ContractDetails";
import ContractEditPage from "@/pages/contracts/ContractEdit";
import ContractAnalysisPage from "@/pages/contracts/ContractAnalysis";
import ContractInvestigatorPage from "@/pages/contracts/ContractInvestigator";
import { UploadContract } from "../pages/contracts/UploadContract";
import { WitnessWorkflow } from "../pages/WitnessWorkflow";
import { WitnessReview } from "../pages/WitnessReview";
import { UserManagement } from "../pages/dashboard/UserManagement";
import { PlaceholderPage } from "@/pages/dashboard/PlaceholderPage";
import { AuditLogPage } from "../pages/AuditLogPage";
// import { PlaceholderPage } from "../pages/PlaceholderPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/accept-invitation/:token"
          element={<AcceptInvitation />}
        />
      </Route>

      <Route path="/witness/:token" element={<WitnessReview />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/contracts/:id/edit" element={<ContractEditPage />} />
          <Route
            path="/contracts/:id/analysis"
            element={<ContractAnalysisPage />}
          />
          <Route
            path="/contracts/:id/investigator"
            element={<ContractInvestigatorPage />}
          />
          <Route
            path="/insights/auto-renewal"
            element={
              <PlaceholderPage
                title="Auto Renewal Alerts"
                description="Auto-renew clauses triggering within 60 days"
              />
            }
          />
          <Route
            path="/insights/liability"
            element={
              <PlaceholderPage
                title="Liability Risks"
                description="Uncapped or broad indemnification terms"
              />
            }
          />
          <Route
            path="/insights/non-compete"
            element={
              <PlaceholderPage
                title="Non-Compete Detection"
                description="Restrictive covenants requiring legal review"
              />
            }
          />
          <Route
            path="/insights/ip-assignment"
            element={
              <PlaceholderPage
                title="IP Assignment Detection"
                description="Intellectual property transfer provisions found"
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
          <Route path="/users" element={<UserManagement />} />

          <Route path="/witness" element={<WitnessWorkflow />} />
          <Route path="/witness-workflow" element={<WitnessWorkflow />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />

          <Route path="/settings" element={<Settings />} />
          <Route path="/upload" element={<UploadContract />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
