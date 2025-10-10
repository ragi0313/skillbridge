import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster"
import { ClientProviders } from "@/components/providers/ClientProviders"
import { initializeServer } from "@/lib/server-init"
import "./globals.css";

// Initialize server services
if (typeof window === 'undefined') {
  initializeServer()
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BridgeMentor",
  description: "Freelance mentorship app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-blue-100 via-white to-purple-100`}
      >
        <ClientProviders>
          {children}
        </ClientProviders>
        {/* <Toaster /> Temporarily disabled due to React child error */}
      </body>
    </html>
  );
}
