import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PageTransitionEffect from "@/components/PageTransitionEffect";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Studio Ten",
  description: "Built For Change",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-[100dvh] antialiased`}
    >
      <body className="h-[100dvh] flex flex-col">
        {/* The global transition overlay mounts here */}
        <PageTransitionEffect />
        {children}
      </body>
    </html>
  );
}
