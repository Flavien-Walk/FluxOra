import { auth } from '@clerk/nextjs/server';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import HowItWorks from '@/components/landing/HowItWorks';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata = {
  title: 'Fluxora — Cockpit financier pour freelances & PME',
  description:
    'Gérez vos factures, devis, dépenses et comptabilité depuis un seul outil. Pensé pour les freelances et PME.',
};

export default async function Home() {
  const { userId } = await auth();
  const isConnected = !!userId;

  return (
    <main>
      <LandingNav isConnected={isConnected} />
      <HeroSection isConnected={isConnected} />
      <FeaturesGrid />
      <HowItWorks />
      <PricingSection isConnected={isConnected} />
      <FAQSection />
      <LandingFooter />
    </main>
  );
}
