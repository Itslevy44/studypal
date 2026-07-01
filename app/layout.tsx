import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "StudyPal — Kenya's #1 Student Study Resource",
  description:
    "Download the StudyPal app and access thousands of past exam papers from top Kenyan universities. Pay securely via M-Pesa.",
  keywords: ["past papers", "Kenya", "university", "exam", "study", "M-Pesa", "APK", "download"],
  authors: [{ name: "StudyPal" }],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  openGraph: {
    title: "StudyPal — Kenya's #1 Student Study Resource",
    description: "Download the StudyPal Android app and access thousands of past exam papers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
