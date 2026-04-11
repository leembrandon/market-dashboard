import "./globals.css";

export const metadata = {
  title: "LevelSight — Market Stats for Futures Traders",
  description:
    "Probability-driven trading statistics. Gap fills, ORB, initial balance, prior day levels — the numbers that matter.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
