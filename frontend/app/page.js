import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import HowItWorks from '@/components/landing/HowItWorks';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import LandingFooter from '@/components/landing/LandingFooter';
import { FAQS } from '@/data/faq';
import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Fluxora — Cockpit financier pour freelances & PME',
  description:
    'Gérez vos factures, devis, dépenses et comptabilité depuis un seul outil. Pensé pour les freelances et PME.',
  alternates: { canonical: '/' },
};

// Données structurées (schema.org) : application + FAQ
const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Fluxora',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web, iOS, Android (PWA)',
    url: SITE_URL,
    description: 'Cockpit financier pour freelances et PME : factures, devis, dépenses, TVA, trésorerie et assistant IA.',
    inLanguage: 'fr',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
];

export default async function Home({ searchParams }) {
  const { userId } = await auth();

  // Utilisateur connecté → redirection directe vers le dashboard
  // sauf si ?preview=1 (lien "Découvrir Fluxora" depuis la sidebar)
  const params = await searchParams;
  if (userId && params?.preview !== '1') {
    redirect('/dashboard');
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, String.fromCharCode(92) + 'u003c') }} />
      <LandingNav isConnected={false} />
      <HeroSection isConnected={false} />
      <FeaturesGrid />
      <HowItWorks />
      <PricingSection isConnected={false} />
      <FAQSection />
      <LandingFooter />
    </main>
  );
}
