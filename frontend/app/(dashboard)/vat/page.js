import { useState, useEffect } from 'react';
import { useVatSummary, useVatDeclarations, createVatDeclaration, updateCreditOption } from '@/hooks/useVat';
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { AlertCircle, TrendingUp, TrendingDown, Landmark, Scale, Coins, FileText, CheckCircle, RefreshCw, Archive } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { subMonths, subYears, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

// Formatte un nombre en devise EUR
const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value != null ? value : 0);
  
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR');

function CreditOptionManager({ decl, mutate }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateOption = async (option) => {
    setIsLoading(true);
    try {
      await updateCreditOption(decl._id, option);
      toast.success(`L'option de crédit a été mise à jour.`);
      mutate(); // Rafraîchit la liste des déclarations
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de la mise à jour.");
    } finally {
      setIsLoading(false);
    }
  };

  if (decl.vatCredit <= 0) {
    return <Button variant="outline" size="sm" disabled>Pas de crédit</Button>;
  }

  if (decl.creditOption === 'carry_forward') {
    return <Badge variant="green"><Archive size={12} className="mr-1" /> Reporté</Badge>;
  }
  
  if (decl.creditOption === 'refund') {
    return <Badge variant="purple"><RefreshCw size={12} className="mr-1" /> Remboursé</Badge>;
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => handleUpdateOption('carry_forward')} variant="outline" size="sm" loading={isLoading}>
        Reporter
      </Button>
      <Button onClick={() => handleUpdateOption('refund')} variant="outline" size="sm" loading={isLoading}>
        Rembourser
      </Button>
    </div>
  );
}


import Link from 'next/link';
import { useState, useEffect } from 'react';
//... (rest of the imports are unchanged)

//... (CreditOptionManager component is unchanged)


function DeclarationsHistory({ mutate }) {
  //... (rest of the component is unchanged until the map function)
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-gray-800">Historique des déclarations</h3>
      </CardHeader>
      <CardBody className="divide-y divide-gray-100">
        {declarations.map((decl) => (
          <div key={decl._id} className="py-3 grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
            <div className="col-span-2 md:col-span-2">
              <p className="font-medium text-gray-800">
                Période du {formatDate(decl.startDate)} au {formatDate(decl.endDate)}
              </p>
              <Badge variant={decl.regime === 'CA3' ? 'blue' : 'purple'}>{decl.regime}</Badge>
            </div>
            <div className="text-right md:text-left">
              <p className="text-xs text-gray-500">TVA Due</p>
              <p className="font-medium text-gray-800">{formatCurrency(decl.vatDue)}</p>
            </div>
            <div className="text-right md:text-left">
              <p className="text-xs text-gray-500">Crédit de TVA</p>
              <p className="font-medium text-green-600">{formatCurrency(decl.vatCredit)}</p>
            </div>
             <div className="text-right col-span-2 md:col-span-2 flex justify-end items-center gap-2">
               <CreditOptionManager decl={decl} mutate={mutate} />
               <Link href={`/vat/${decl._id}`} passHref>
                 <Button as="a" variant="outline" size="sm">Détail</Button>
               </Link>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

//... (rest of the file is unchanged)

const RegimeSwitcher = ({ regime, setRegime }) => {
  return (
    <div className="flex items-center p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => setRegime('CA3')}
        className={cn(
          "px-3 py-1 text-sm font-medium rounded-md transition-colors",
          regime === 'CA3' ? 'bg-white text-accent-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Mensuel (CA3)
      </button>
      <button
        onClick={() => setRegime('CA12')}
        className={cn(
          "px-3 py-1 text-sm font-medium rounded-md transition-colors",
          regime === 'CA12' ? 'bg-white text-accent-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Annuel (CA12)
      </button>
    </div>
  )
}


// Page principale de la TVA
export default function VatPage() {
  const [regime, setRegime] = useState('CA3');
  const [dateRange, setDateRange] = useState();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const today = new Date();
    if (regime === 'CA3') {
      const prevMonth = subMonths(today, 1);
      setDateRange({ from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) });
    } else { // CA12
      const prevYear = subYears(today, 1);
      setDateRange({ from: startOfYear(prevYear), to: endOfYear(prevYear) });
    }
  }, [regime]);

  const fromDate = dateRange?.from?.toISOString().split('T')[0];
  const toDate = dateRange?.to?.toISOString().split('T')[0];
  
  const { summary, isLoading, error } = useVatSummary(fromDate, toDate);
  const { mutate: mutateDeclarations } = useVatDeclarations();

  const handleCreateDeclaration = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Veuillez sélectionner une période complète.');
      return;
    }
    setIsCreating(true);
    try {
      await createVatDeclaration({
        startDate: fromDate,
        endDate: toDate,
        regime,
      });
      toast.success('La déclaration de TVA a été sauvegardée avec succès.');
      mutateDeclarations(); // Re-valide la liste des déclarations
    } catch (err) {
      const message = err.response?.data?.error || 'Une erreur est survenue.';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Toaster richColors />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Déclaration de TVA
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Préparez votre déclaration de TVA mensuelle (CA3) ou annuelle (CA12).
              </p>
            </div>
            <div className="flex items-center gap-4">
              <RegimeSwitcher regime={regime} setRegime={setRegime} />
              <DateRangePicker range={dateRange} onSelectRange={setDateRange} />
              <Button onClick={handleCreateDeclaration} disabled={isCreating || !summary}>
                {isCreating ? 'Sauvegarde...' : 'Sauvegarder la déclaration'}
              </Button>
            </div>
          </header>

          {(isLoading || !dateRange) && <p>Chargement...</p>}

          {error && (
            <Card className="border-red-200 bg-red-50 mb-8">
              <CardBody className="flex items-center gap-4">
                <AlertCircle className="text-red-600" size={24} />
                <div>
                  <h3 className="font-semibold text-red-800">Erreur de chargement du résumé</h3>
                  <p className="text-sm text-red-700">{error.message}</p>
                </div>
              </CardBody>
            </Card>
          )}

          {summary && !isLoading && !error && (
            <div className="space-y-8">
              {/* Cartes de statistiques principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  label="Solde de TVA"
                  value={formatCurrency(summary.vatDue > 0 ? summary.vatDue : summary.vatCredit)}
                  sub={summary.vatDue > 0 ? "Montant à payer" : "Crédit de TVA"}
                  icon={Scale}
                  color={summary.vatDue > 0 ? 'red' : 'green'}
                />
                <StatCard
                  label="TVA Collectée"
                  value={formatCurrency(summary.collectedVAT)}
                  icon={TrendingUp}
                  color="indigo"
                />
                <StatCard
                  label="TVA Déductible"
                  value={formatCurrency(summary.totalDeductibleVAT)}
                  icon={TrendingDown}
                  color="blue"
                />
              </div>
              
              {/* Tableau de détail */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-800">Détail du calcul pour la période</h3>
                </CardHeader>
                <CardBody>
                  <dl className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <TrendingUp size={16} className="text-indigo-500" />
                        <span>TVA Collectée (sur ventes)</span>
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(summary.collectedVAT)}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center py-2">
                       <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <TrendingDown size={16} className="text-blue-500" />
                        <span>TVA Déductible (sur achats)</span>
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(summary.totalDeductibleVAT)}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center pl-8 pb-2">
                       <dt className="flex items-center gap-2 text-xs text-gray-500">
                         <Coins size={14} />
                         <span>... sur biens et services</span>
                      </dt>
                      <dd className="text-xs text-gray-700 tabular-nums">
                        {formatCurrency(summary.deductibleVAT_services)}
                      </dd>
                    </div>
                     <div className="flex justify-between items-center pl-8 pb-2 border-b">
                       <dt className="flex items-center gap-2 text-xs text-gray-500">
                         <Landmark size={14} />
                         <span>... sur immobilisations</span>
                      </dt>
                      <dd className="text-xs text-gray-700 tabular-nums">
                        {formatCurrency(summary.deductibleVAT_assets)}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                       <dt className="text-base font-semibold text-gray-800">
                         {summary.vatDue > 0 ? "TVA à payer" : "Crédit de TVA"}
                      </dt>
                      <dd className={`text-base font-bold tabular-nums ${summary.vatDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(summary.vatDue > 0 ? summary.vatDue : summary.vatCredit)}
                      </dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>
            </div>
            
            {/* Historique */}
            <div className="mt-12">
               <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">
                Historique
              </h2>
              <DeclarationsHistory mutate={mutateDeclarations} />
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
