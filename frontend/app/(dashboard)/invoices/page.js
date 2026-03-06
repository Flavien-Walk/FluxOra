import Header from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FilePlus, FileText } from 'lucide-react';

export default function InvoicesPage() {
  return (
    <>
      <Header title="Factures" />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">Créez et suivez vos factures</p>
          <Button>
            <FilePlus size={16} />
            Nouvelle facture
          </Button>
        </div>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucune facture pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">
              Créez votre première facture et envoyez-la en un clic
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
