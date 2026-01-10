import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "bad vibes",
  description: "playlist management hackery",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

import Navbar from "./_components/Navbar";
import { AuthProvider } from "./_components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <AuthProvider>
            <div className="app-container">
              <Navbar />
              <main className="content-area">
                {children}
              </main>
            </div>
          </AuthProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
