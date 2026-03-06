import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Si l'utilisateur est déjà connecté → dashboard directement
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          MVP · Version 1.0
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Fluxora
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          Le cockpit financier des freelances et PME.
          <br />
          Factures, paiements, comptabilité — tout en un.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/sign-in"
            className="border border-gray-200 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
