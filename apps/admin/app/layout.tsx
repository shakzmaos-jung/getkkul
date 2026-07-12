import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@getkkul/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "getkkul 관제 어드민",
  description: "getkkul 서비스 관제탑 (control tower)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-theme="linear" className={inter.variable}>
      <body>
        <ThemeProvider initialTheme="linear">{children}</ThemeProvider>
      </body>
    </html>
  );
}
