import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppHeader } from "@/client/shell/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Review",
  description: "Review and save public webpage content without executing third-party scripts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[#f4f5fb] text-slate-900 antialiased">
        <a
          href="#main"
          className="absolute start-4 top-4 z-20 -translate-y-16 rounded bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:translate-y-0"
        >
          Skip to content
        </a>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
