import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SocketProvider } from "../components/providers/SocketProvider";
import { NotificationToaster } from "../components/notifications/NotificationToaster";
import NotificationListener from "../components/NotificationListener";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PULSE",
  description: "Modern social media platform",
  icons: {
    icon: "/PULSE.png", 
    apple: "/PULSE.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-white text-neutral-900 antialiased transition-colors duration-150 dark:bg-black dark:text-neutral-100`}
      >
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationListener />
              <NotificationToaster />

              <div className="mx-auto flex min-h-screen w-full justify-center xl:max-w-[1380px] 2xl:max-w-[1480px]">
                <Sidebar />

                <main className="min-h-screen w-full flex-1 border-neutral-200 pt-14 pb-20 sm:border-x sm:pt-0 sm:pb-0 md:max-w-[620px] lg:max-w-[650px] xl:max-w-[700px] 2xl:max-w-[750px] dark:border-neutral-800">
                  {children}
                </main>

                <RightSidebar />
              </div>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
