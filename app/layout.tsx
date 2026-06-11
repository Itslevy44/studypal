import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudyPal — Kenya's #1 Student Study Resource",
  description: "Access thousands of past exam papers from top Kenyan universities. Browse freely, purchase securely via M-Pesa, and study smarter.",
  keywords: ["past papers", "Kenya", "university", "exam", "study", "KCSE", "M-Pesa"],
  authors: [{ name: "StudyPal" }],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  openGraph: {
    title: "StudyPal — Kenya's #1 Student Study Resource",
    description: "Access thousands of past exam papers from top Kenyan universities.",
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
