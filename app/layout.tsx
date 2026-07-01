import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "StudyPal — Kenya's #1 Student Study Resource",
  description:
    "Access thousands of past exam papers from top Kenyan universities. Browse freely, purchase securely via M-Pesa, and study smarter.",
  keywords: [
    "past papers",
    "Kenya",
    "university",
    "exam",
    "study",
    "KCSE",
    "M-Pesa",
  ],
  authors: [{ name: "StudyPal" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudyPal",
    startupImage: "/logo.png",
  },
  icons: {
    icon: [
      { url: "/api/icons/192", sizes: "192x192", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/logo.svg",
        color: "#4f46e5",
      },
    ],
  },
  openGraph: {
    title: "StudyPal — Kenya's #1 Student Study Resource",
    description:
      "Access thousands of past exam papers from top Kenyan universities.",
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
      <head>
        {/* PWA — mobile app capable meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="StudyPal" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
        <meta name="msapplication-TileImage" content="/api/icons/144" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('[SW] Registered:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[SW] Registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
