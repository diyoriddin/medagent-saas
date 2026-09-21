import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedAgent - Admin Dashboard',
  description: 'Clinic administration and real-time queue management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  );
}
