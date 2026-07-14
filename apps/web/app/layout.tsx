import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import { ToastProvider } from "@/components/ui/ToastProvider";
import AppChrome from "@/components/layout/AppChrome";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getThemePreference } from "@/lib/theme/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SSR 초기 테마(DB, 로그인 시). 부트스트랩과 ThemeProvider 가 동일 우선순위(SSR>localStorage>system)로 사용.
  const initialTheme = await getThemePreference();
  const bootstrap =
    `(function(){try{var p=${JSON.stringify(initialTheme)}||localStorage.getItem('theme')||'system';` +
    `var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;` +
    `document.documentElement.setAttribute('data-theme',p==='system'?(m?'dark':'light'):p);}catch(e){}})();`;
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
        <ThemeProvider initialPreference={initialTheme}>
          <ServiceWorkerRegister />
          <ToastProvider>
            <AppChrome>{children}</AppChrome>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
