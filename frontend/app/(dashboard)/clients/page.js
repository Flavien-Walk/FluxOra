import Header from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UserPlus, Users } from 'lucide-react';

export default function ClientsPage() {
  return (
    <>
      <Header title="Clients" />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">Gérez vos clients et leur historique</p>
          <Button>
            <UserPlus size={16} />
            Nouveau client
          </Button>
        </div>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucun client pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajoutez votre premier client pour commencer
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
