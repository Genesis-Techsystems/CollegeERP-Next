import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "College ERP",
    template: "%s · College ERP",
  },
  description: "Academic Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${sora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply saved colour theme + dark mode before first paint (no flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('erp_theme_settings')||'{}');var t=s.colorScheme||'university-blue';document.documentElement.setAttribute('data-theme',t);var m=s.themeMode||'light';if(m==='system'){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(m==='dark'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.setAttribute('data-theme','university-blue');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
