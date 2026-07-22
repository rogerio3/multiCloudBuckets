import { redirect } from 'next/navigation';

export default function Home() {
  // AuthGuard on /logs bounces unauthenticated users to /login.
  redirect('/logs');
}