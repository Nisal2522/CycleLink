/**
 * main.jsx
 * --------------------------------------------------
 * Application entry point.
 *
 * Provider hierarchy:
 *   React.StrictMode
 *   └── QueryClientProvider — TanStack React Query (data caching)
 *       └── BrowserRouter   — React Router (URL routing)
 *           └── AuthProvider — global auth state (Context API)
 *               └── App      — route definitions & pages
 *   Toaster — react-hot-toast (global toast notifications)
 * --------------------------------------------------
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import AuthProvider from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

import "./index.css";

// Google OAuth: set VITE_GOOGLE_CLIENT_ID in .env. If you see 403 "origin is not allowed for the given client ID",
// add your app origin in Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID →
// Authorized JavaScript origins: http://localhost:5173, http://localhost:3000, and your production URL.
const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "project-2cc0997c-aa2b-433a-8c9";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 min — data considered fresh, no refetch
      gcTime: 1000 * 60 * 10,     // 10 min — keep unused cache in memory
      refetchOnWindowFocus: false, // don't refetch when switching tabs back
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { fontSize: "14px", borderRadius: "12px" },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
