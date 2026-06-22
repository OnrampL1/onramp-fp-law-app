import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { SidebarInset, SidebarProvider } from "../components/ui/sidebar";

export function AppLayout() {
  return (
    <SidebarProvider className="min-h-screen overflow-hidden">
      <Sidebar />
      <SidebarInset className="min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
