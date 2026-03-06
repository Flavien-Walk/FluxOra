import Header from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <>
      <Header title="Paramètres" />
      <div className="flex-1 p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Organisation</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-400">
              Configuration de l'organisation disponible après onboarding.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
