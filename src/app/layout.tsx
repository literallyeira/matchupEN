import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import AdBanners from "@/components/AdBanners";
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "MatchUp",
  description: "Find the love of your life with MatchUp! Apply now, match and meet.",
  keywords: "dating, matching, meet, love, matchup",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "MatchUp",
    description: "Find the love of your life with MatchUp!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <Providers>
          <AdBanners />
          <div className="flex-1 w-full">
            {children}
          </div>

          {/* Global Footer */}
          <footer className="w-full py-8 px-6 border-t border-white/5 bg-[#0c0c0c]/80">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
              <div className="flex flex-col items-center md:items-start gap-4">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <a href="https://forum-tr.gta.world" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://forum-tr.gta.world/uploads/monthly_2025_02/logo.png.3fe10156c1213bdb8f59cd9bc9e15781.png"
                      alt="GTA World TR"
                      className="h-6 w-auto opacity-70"
                      loading="lazy"
                    />
                  </a>
                  <div className="flex items-center gap-6">
                    <Link href="/orders" className="flex items-center gap-2 text-gray-500 hover:text-[var(--matchup-primary)] transition-colors">
                      <i className="fa-solid fa-receipt text-lg"></i>
                      <span>My Orders</span>
                    </Link>
                    <a href="https://discord.gg/gtaworldtr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-500 hover:text-[#5865F2] transition-colors">
                      <i className="fa-brands fa-discord text-lg"></i>
                      <span>Discord</span>
                    </a>
                    <a href="https://facebrowser-tr.gta.world" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors">
                      <i className="fa-solid fa-globe text-lg"></i>
                      <span>Facebrowser</span>
                    </a>
                  </div>
                </div>
                <div className="text-gray-600 text-[10px] md:text-left text-center space-y-1">
                  <p>(( Matchup is not an official GTAW website, it is third-party software. ))</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-gray-600">
                <p>© 2026 MatchUp</p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
