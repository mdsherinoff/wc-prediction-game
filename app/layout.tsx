import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "WC26 Predictor",
  description: "World Cup 2026 prediction pool for friends",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <NavBar
            user={
              session?.user
                ? { name: session.user.name, image: session.user.image }
                : null
            }
          />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line py-6 text-center text-xs text-ink/50">
            Friends prediction pool · World Cup 2026
          </footer>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
