import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import TaskToggle from "./components/TaskToggle";

export const metadata: Metadata = {
  title: "Corner Case Bench — Robustness Dashboard",
  description: "YOLOv8 autonomous driving model stress test & vulnerability analysis",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="nav-link">
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--divider)",
          boxShadow: "0 1px 0 rgba(0,0,0,0.05), 0 4px 12px rgba(99,102,241,0.06)",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 48px", display: "flex", alignItems: "center", height: 52 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span style={{
                fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 15,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Corner Case Bench
              </span>
            </div>

            {/* Task toggle */}
            <div style={{ marginLeft: 20 }}>
              <TaskToggle />
            </div>

            {/* Nav links */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
              <NavLink href="/">Overview</NavLink>
              <NavLink href="/compare">Compare</NavLink>
              <NavLink href="/gallery">Gallery</NavLink>
            </div>
          </div>
        </nav>
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 48px" }}>{children}</main>
      </body>
    </html>
  );
}
