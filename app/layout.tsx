import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marco's On The Shore - Order Online",
  description: "Family run fish & chip shop. Est. 1997",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}