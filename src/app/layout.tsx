import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
title: 'Plachet',
description: 'Commandez vos panneaux de fenêtre par lots (10) – finitions ruban adhésif ou ventouses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="fr">
<body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
</html>
);
}
