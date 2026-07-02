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
  metadataBase: new URL('https://studypal-rust.vercel.app'),
  title: {
    default: "StudyPal — Kenya's #1 Student Study Resource | Past Papers & Study Materials",
    template: "%s | StudyPal"
  },
  description:
    "Download StudyPal Android app for free access to thousands of past exam papers from Kenyan universities. Secure M-Pesa payments, offline downloads, and marketplace for academic materials. Download APK now!",
  keywords: [
    "past papers Kenya",
    "university past papers",
    "exam papers download",
    "Kenya university exams",
    "M-Pesa student app",
    "past papers APK",
    "Egerton past papers",
    "KU past papers",
    "JKUAT past papers",
    "study materials Kenya",
    "exam revision",
    "student app Kenya",
    "academic marketplace",
    "offline study app"
  ],
  authors: [{ name: "StudyPal", url: "https://studypal-rust.vercel.app" }],
  creator: "StudyPal",
  publisher: "StudyPal",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://studypal-rust.vercel.app",
    siteName: "StudyPal",
    title: "StudyPal — Kenya's #1 Student Study Resource",
    description: "Download the StudyPal Android app and access thousands of past exam papers from Kenyan universities. Secure M-Pesa payments, offline study, and academic marketplace.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StudyPal - Past Papers & Study Materials for Kenyan Students",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyPal — Kenya's #1 Student Study Resource",
    description: "Access thousands of past exam papers from Kenyan universities. Download APK now!",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://studypal-rust.vercel.app",
  },
  verification: {
    google: "42d4598fe1c93dcd",
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
