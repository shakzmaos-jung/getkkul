import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import { ToastProvider } from "@/components/ui/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const OG_DESC = "유튜브 콘텐츠를 꿀같이 압축해 당신의 소중한 시간을 절약해드립니다";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "https://getkkul.vercel.app"),
  title: "겟꿀 — 구독 채널 요약 다이제스트",
  description: OG_DESC,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "겟꿀" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // 링크 공유(카카오톡/문자 등) 미리보기 + 공유 시트 아이콘용. og:image 는 app/opengraph-image.tsx 자동 첨부.
  openGraph: {
    type: "website",
    siteName: "겟꿀",
    title: "겟꿀",
    description: OG_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: "겟꿀",
    description: OG_DESC,
  },
};

export const viewport: Viewport = {
  themeColor: "#F59E0B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}",
          }}
        />
        <ServiceWorkerRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
