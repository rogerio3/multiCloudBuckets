import type { ReactNode } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';

export default function LogsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </AuthGuard>
  );
}