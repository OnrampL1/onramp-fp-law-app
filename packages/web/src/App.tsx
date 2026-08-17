import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { PlatformAuthProvider } from "./providers/PlatformAuthProvider";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlatformAuthProvider>
          <AppRoutes />
        </PlatformAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
