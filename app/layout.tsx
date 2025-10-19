import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "agentkit Amazing",
  description: "agentkit Amazing - Powered by ChatKit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* OpenAI ChatKit domain allowlist public key */}
        <meta
          name="openai-domain-public-key"
          content={
            process.env.NEXT_PUBLIC_OPENAI_DOMAIN_PUBLIC_KEY ??
            "domain_pk_68f46d3d37e881908894d01b7f604e7c0ea25b410b244d9c"
          }
        />
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
