import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

import { Fredoka, Baloo_2 } from "next/font/google";

// Load Fredoka font
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fredoka",
});

// Load Baloo 2 font
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-baloo",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} 
        ${fredoka.variable} ${baloo.variable}
        antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
