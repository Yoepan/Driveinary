import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Driveinary - Personal Media Cloud & API Gateway',
  description: 'Turn your Google Drive into a high-performance media management and delivery service.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-canvas text-slate-50 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
