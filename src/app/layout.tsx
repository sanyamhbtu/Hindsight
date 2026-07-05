import type { Metadata } from "next";
import { Geist, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  weight: ["500", "600"],
  variable: "--font-geist",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  weight: ["400", "500"],
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Chow - What Happened?",
  description: "The night you'll never remember.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-row bg-[#fafafa] text-[#0d0d0d] relative">
        <Sidebar />
        <div className="flex-1 flex flex-col relative h-screen overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
