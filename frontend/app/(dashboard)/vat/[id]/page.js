'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useVatDeclaration } from '@/hooks/useVat';
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowLeft, TrendingUp, TrendingDown, Scale } from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value != null ? value : 0);
  
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR');

function DetailLoadingState() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export default function VatDetailPage() {
  const params = useParams();
  const { id } = params;

  const { declaration, isLoading, error } = useVatDeclaration(id);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto"><DetailLoadingState /></div>
      </div>
    );
  }

  if (error) {
    return (
       <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardBody className="flex items-center gap-4">
              <AlertCircle className="text-red-600" size={24} />
              <div>
                <h3 className="font-semibold text-red-800">Erreur de chargement</h3>
                <p className="text-sm text-red-700">{error.message}</p>
                 <Button as="a" href="/vat" variant="link" className="mt-2">
                  <ArrowLeft size={14} className="mr-1" />
                  Retour à la liste
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (!declaration) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <Link href="/vat" className="flex items-center text-sm text-gray-500 hover:text-gray-800 mb-2">
            <ArrowLeft size={14} className="mr-1" />
            Retour à la synthèse
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Détail de la déclaration
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Période du {formatDate(declaration.startDate)} au {formatDate(declaration.endDate)}
          </p>
        </header>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             <StatCard
                label="Solde de TVA"
                value={formatCurrency(declaration.vatDue > 0 ? declaration.vatDue : declaration.vatCredit)}
                sub={declaration.vatDue > 0 ? "Montant à payer" : "Crédit de TVA"}
                icon={Scale}
                color={declaration.vatDue > 0 ? 'red' : 'green'}
              />
              <StatCard
                label="TVA Collectée"
                value={formatCurrency(declaration.collectedVAT)}
                icon={TrendingUp}
                color="indigo"
              />
              <StatCard
                label="TVA Déductible"
                value={formatCurrency(declaration.totalDeductibleVAT)}
                icon={TrendingDown}
                color="blue"
              />
          </div>

          <Card>
            <CardHeader><h3 className="font-semibold text-gray-800">TVA Collectée - Factures payées</h3></CardHeader>
            <CardBody>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2 font-normal">Facture #</th>
                    <th className="py-2 font-normal">Client</th>
                    <th className="py-2 font-normal text-right">Montant HT</th>
                    <th className="py-2 font-normal text-right">Montant TVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {declaration.sources?.invoices.map(inv => (
                    <tr key={inv._id}>
                      <td className="py-2 font-medium">{inv.number}</td>
                      <td className="py-2">{inv.clientId?.name || 'N/A'}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(inv.subtotal)}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(inv.vatAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

           <Card>
            <CardHeader><h3 className="font-semibold text-gray-800">TVA Déductible - Dépenses validées</h3></CardHeader>
            <CardBody>
                <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2 font-normal">Description</th>
                    <th className="py-2 font-normal">Fournisseur</th>
                    <th className="py-2 font-normal text-right">Montant HT</th>
                    <th className="py-2 font-normal text-right">TVA Récupérable</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {declaration.sources?.expenses.map(exp => (
                    <tr key={exp._id}>
                      <td className="py-2 font-medium">{exp.description}</td>
                      <td className="py-2">{exp.vendor}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(exp.amountHT)}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(exp.vatRecoverable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  );
}
