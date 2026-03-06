import Header from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Receipt } from 'lucide-react';

export default function ExpensesPage() {
  return (
    <>
      <Header title="Dépenses" />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">Suivez vos dépenses par catégorie</p>
          <Button>
            <Plus size={16} />
            Nouvelle dépense
          </Button>
        </div>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucune dépense enregistrée</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajoutez vos dépenses pour les catégoriser automatiquement
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
