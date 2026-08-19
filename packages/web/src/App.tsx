import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { PlatformAuthProvider } from "./providers/PlatformAuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <PlatformAuthProvider>
            <AppRoutes />
          </PlatformAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
