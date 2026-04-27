import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SnackbarProvider } from "notistack";
import { AuthProvider } from "../context/AuthContext";
import { CompanyProvider } from "../context/CompanyContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <CompanyProvider>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={4000}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Component {...pageProps} />
        </SnackbarProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}
