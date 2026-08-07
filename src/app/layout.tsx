import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { AppSessionProvider } from "@/components/auth/session-provider";
import { InternalNavigationShell } from "@/components/navigation/internal-navigation-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mercer & Stellaria Corporation",
  description:
    "Holding de présentation du Mercer & Stellaria Law Office et de Mercer & Stellaria Insurance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${montserrat.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AppSessionProvider>
            <InternalNavigationShell>{children}</InternalNavigationShell>
          </AppSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
