'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertTriangle } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const getMonthRange = (year, month) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
};

const fetcher = (url) => api.get(url).then((r) => r.data);

function VATDashboard() {
    const [currentDate, setCurrentDate] = useState(new Date(new Date().setDate(1)));
    const { from, to } = useMemo(() => getMonthRange(currentDate.getFullYear(), currentDate.getMonth() + 1), [currentDate]);
    const period = useMemo(() => `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`, [currentDate]);

    const { data: declaration, error, isLoading, mutate } = useSWR(
        from && to ? `/api/vat/declaration?from=${from}&to=${to}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const goToPreviousMonth = () => {
        setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    };

    const periodLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate);

    const handleFinalize = async () => {
        if (!confirm("Voulez-vous finaliser cette déclaration ? Elle ne pourra plus être modifiée.")) return;
        try {
            await api.post(`/api/vat/declaration/${period}/finalize`);
            mutate(); // Re-fetch data
        } catch (err) {
            alert(err.response?.data?.error || "Erreur lors de la finalisation.");
        }
    };

    const isFinalized = declaration?.status === 'finalized';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-gray-700">Déclaration de TVA (Régime Réel Normal - CA3)</h2>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={goToPreviousMonth}>Précédent</Button>
                            <span className="text-sm font-medium w-32 text-center">{periodLabel}</span>
                            <Button variant="secondary" size="sm" onClick={goToNextMonth}>Suivant</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    {isLoading && <Skeleton className="h-40 w-full" />}
                    {error && <p className="text-red-500">Erreur de chargement des données.</p>}
                    {declaration && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* TVA Collectée */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm font-medium text-blue-800">TVA Collectée</p>
                                <p className="text-2xl font-bold text-blue-900">{fmt(declaration.collectedVAT.total)}</p>
                                <p className="text-xs text-blue-600">Sur les ventes et prestations</p>
                            </div>

                            {/* TVA Déductible */}
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                <p className="text-sm font-medium text-indigo-800">TVA Déductible</p>
                                <p className="text-2xl font-bold text-indigo-900">{fmt(declaration.deductibleVAT.total)}</p>
                                <div className="text-xs text-indigo-600">
                                    <p>Biens/Services: {fmt(declaration.deductibleVAT.goodsAndServices.total)}</p>
                                    <p>Immobilisations: {fmt(declaration.deductibleVAT.fixedAssets.total)}</p>
                                </div>
                            </div>

                            {/* Solde */}
                            <div className={`p-4 rounded-lg border ${declaration.vatDue > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                {declaration.vatDue > 0 ? (
                                    <>
                                        <p className="text-sm font-medium text-red-800">TVA à Payer</p>
                                        <p className="text-2xl font-bold text-red-900">{fmt(declaration.vatDue)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-green-800">Crédit de TVA</p>
                                        <p className="text-2xl font-bold text-green-900">{fmt(summary.vatCredit)}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-700">Aperçu de la déclaration {isFinalized && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Finalisée</span>}</h3>
                        {!isFinalized && declaration && (
                            <Button size="sm" onClick={handleFinalize}>Finaliser la déclaration</Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody className="p-0">
                    {isFinalized && (
                        <div className="p-4 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800 flex items-start gap-3">
                            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Cette déclaration est finalisée.</p>
                                <p>Les montants ci-dessous sont à reporter sur votre espace impots.gouv.fr. Toute nouvelle facture ou dépense pour cette période ne sera pas prise en compte.</p>
                            </div>
                        </div>
                    )}
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Ligne</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Opérations</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500">Base HT</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500">TVA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr className="font-semibold text-gray-800"><td colSpan="4" className="px-4 py-2 bg-gray-100">TVA BRUTE (TVA collectée)</td></tr>
                            {declaration?.collectedVAT.breakdown.map(item => (
                                <tr key={`coll-${item.rate}`}>
                                    <td className="px-4 py-3 text-gray-500">08</td>
                                    <td className="px-4 py-3">Opérations imposables à {item.rate}%</td>
                                    <td className="px-4 py-3 text-right">{fmt(item.base)}</td>
                                    <td className="px-4 py-3 text-right font-medium">{fmt(item.amount)}</td>
                                </tr>
                            ))}
                             <tr className="font-semibold bg-gray-50">
                                <td className="px-4 py-3" colSpan="3">TOTAL TVA COLLECTÉE</td>
                                <td className="px-4 py-3 text-right font-bold">{fmt(declaration?.collectedVAT.total)}</td>
                            </tr>

                            <tr className="font-semibold text-gray-800"><td colSpan="4" className="px-4 py-2 bg-gray-100">TVA DÉDUCTIBLE</td></tr>
                            {declaration?.deductibleVAT.fixedAssets.breakdown.map(item => (
                                <tr key={`ded-immo-${item.rate}`}>
                                    <td className="px-4 py-3 text-gray-500">19</td>
                                    <td className="px-4 py-3">Sur immobilisations (TVA à {item.rate}%)</td>
                                    <td className="px-4 py-3 text-right">{fmt(item.base)}</td>
                                    <td className="px-4 py-3 text-right font-medium">{fmt(item.amount)}</td>
                                </tr>
                            ))}
                            {declaration?.deductibleVAT.goodsAndServices.breakdown.map(item => (
                                <tr key={`ded-serv-${item.rate}`}>
                                    <td className="px-4 py-3 text-gray-500">20</td>
                                    <td className="px-4 py-3">Sur autres biens et services (TVA à {item.rate}%)</td>
                                    <td className="px-4 py-3 text-right">{fmt(item.base)}</td>
                                    <td className="px-4 py-3 text-right font-medium">{fmt(item.amount)}</td>
                                </tr>
                            ))}
                            <tr className="font-semibold bg-gray-50">
                                <td className="px-4 py-3" colSpan="3">TOTAL TVA DÉDUCTIBLE</td>
                                <td className="px-4 py-3 text-right font-bold">{fmt(declaration?.deductibleVAT.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </CardBody>
            </Card>
        </div>
    );
}

export default function VATPage() {
    return (
        <>
            <Header title="Gestion de la TVA" />
            <div className="flex-1 p-6">
                <VATDashboard />
            </div>
        </>
    );
}