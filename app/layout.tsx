import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'ReadingTown Staff',
  description: 'Internal dashboard for attendance and feedback'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
