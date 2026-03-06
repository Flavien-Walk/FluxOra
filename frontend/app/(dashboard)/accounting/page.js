import Header from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import { BookOpen } from 'lucide-react';

export default function AccountingPage() {
  return (
    <>
      <Header title="Comptabilité" />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">Journal comptable — écritures générées automatiquement</p>
        </div>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Journal vide</p>
            <p className="text-gray-400 text-sm mt-1">
              Les écritures comptables apparaîtront ici automatiquement lors des paiements
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
