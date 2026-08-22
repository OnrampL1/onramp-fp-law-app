import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { OnboardingRoute } from "./OnboardingRoute";
import { PlatformProtectedRoute } from "./PlatformProtectedRoute";
import { PlatformOrganizations } from "../pages/platform/PlatformOrganizations";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { PlatformLayout } from "../layouts/PlatformLayout";
import { Landing } from "../pages/Landing";
import { RequestAccess } from "../pages/RequestAccess";
import { Login } from "../pages/auth/Login";
import { AcceptInvitation } from "../pages/auth/AcceptInvitation";
import { PlatformLogin } from "../pages/platform/PlatformLogin";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { Settings } from "../pages/dashboard/Settings";
import { NotFound } from "../pages/NotFound";
import Contracts from "@/pages/contracts/Contracts";
import ContractDetailPage from "@/pages/contracts/ContractDetails";
import ContractEditPage from "@/pages/contracts/ContractEdit";
import ContractAnalysisPage from "@/pages/contracts/ContractAnalysis";
import ContractInvestigatorPage from "@/pages/contracts/ContractInvestigator";
import ContractFileViewer from "@/pages/contracts/ContractFileViewer";
import { UploadContract } from "../pages/contracts/UploadContract";
import { WitnessWorkflow } from "../pages/WitnessWorkflow";
import { WitnessReview } from "../pages/WitnessReview";
import { UserManagement } from "../pages/dashboard/UserManagement";
import { PlaceholderPage } from "@/pages/dashboard/PlaceholderPage";
import { AuditLogPage } from "../pages/AuditLogPage";
import { OrganizationBrain } from "../pages/dashboard/OrganizationBrain";
import LegalAssistantPage from "../pages/dashboard/LegalAssistant";
import { InsightCategoryPage } from "@/pages/insights/InsightCategoryPage";
import { PlatformAccessRequests } from "../pages/platform/PlatformAccessRequests";
import { OrganizationOnboarding } from "../pages/onboarding/OrganizationOnboarding";
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

      <Route path="/platform/login" element={<PlatformLogin />} />

      <Route path="/witness/:token" element={<WitnessReview />} />

      {/* Protected platform routes */}
      <Route element={<PlatformProtectedRoute />}>
        <Route element={<PlatformLayout />}>
          <Route
            path="/platform"
            element={<Navigate to="/platform/organizations" replace />}
          />
          <Route
            path="/platform/organizations"
            element={<PlatformOrganizations />}
          />
          <Route
            path="/platform/access-requests"
            element={<PlatformAccessRequests />}
          />
        </Route>
      </Route>
      {/* Public landing page */}
      <Route path="/" element={<Landing />} />
      <Route path="/request-access" element={<RequestAccess />} />

      {/* Authenticated onboarding route */}
      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding" element={<OrganizationOnboarding />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
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
              <InsightCategoryPage
                category="AUTO_RENEWAL"
                title="Auto Renewal Alerts"
                description="Contracts flagged for an auto-renewal clause worth reviewing."
              />
            }
          />
          <Route
            path="/insights/liability"
            element={
              <InsightCategoryPage
                category="LIABILITY"
                title="Liability Risks"
                description="Contracts with an uncapped or broad liability exposure."
              />
            }
          />
          <Route
            path="/insights/non-compete"
            element={
              <InsightCategoryPage
                category="NON_COMPETE"
                title="Non-Compete Detection"
                description="Contracts with a non-compete or restrictive covenant flagged."
              />
            }
          />
          <Route
            path="/insights/ip-assignment"
            element={
              <InsightCategoryPage
                category="IP_ASSIGNMENT"
                title="IP Assignment Detection"
                description="Contracts with an IP assignment or transfer provision flagged."
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
          <Route path="/organization-brain" element={<OrganizationBrain />} />
          <Route path="/legal-assistant" element={<LegalAssistantPage />} />
        </Route>

        {/* Outside AppLayout — a chrome-free tab for viewing a contract's
        original file, opened by Contract Details' Download button. */}
        <Route path="/contracts/:id/file" element={<ContractFileViewer />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
