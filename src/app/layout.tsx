import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Plaksha Global Portal",
  description: "Global opportunities platform for Plaksha students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
