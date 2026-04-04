import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "VaidyaNetra AI | Dashboard",
  description: "Premium Medical AI Diagnostic and Patient Analysis Platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex font-sans relative bg-slate-950 text-slate-50 selection:bg-cyan-500/30 overflow-hidden">
        {/* Sidebar - Fixed Left */}
        <Sidebar className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-slate-900/40 backdrop-blur-3xl h-screen" />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto w-full p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
