import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ErrorTracer - Trace production errors before users report them",
  description:
    "Open-source production error debugging and tracing platform. Monitor, debug, and resolve production errors with full context.",
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className: "bg-card border-border text-foreground",
          }}
        />
      </body>
    </html>
  );
}
