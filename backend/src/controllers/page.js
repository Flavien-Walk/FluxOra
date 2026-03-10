'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { SkeletonTable } from '@/components/ui/Skeleton';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const getMonthRange = (year, month) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
};

const fetcher = (url) => api.get(url).then((r) => r.data);

function VATDashboard() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const { from, to } = getMonthRange(year, month);

    const { data: summary, error, isLoading } = useSWR(
        `/api/vat/summary?from=${from}&to=${to}`,
        fetcher
    );

    const goToPreviousMonth = () => {
        setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    };

    const periodLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate);

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
                    {isLoading && <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg" />}
                    {error && <p className="text-red-500">Erreur de chargement des données.</p>}
                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* TVA Collectée */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm font-medium text-blue-800">TVA Collectée</p>
                                <p className="text-2xl font-bold text-blue-900">{fmt(summary.collectedVAT.total)}</p>
                                <p className="text-xs text-blue-600">Sur les ventes et prestations</p>
                            </div>

                            {/* TVA Déductible */}
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                <p className="text-sm font-medium text-indigo-800">TVA Déductible</p>
                                <p className="text-2xl font-bold text-indigo-900">{fmt(summary.deductibleVAT.total)}</p>
                                <div className="text-xs text-indigo-600">
                                    <p>Biens/Services: {fmt(summary.deductibleVAT.goodsAndServices.total)}</p>
                                    <p>Immobilisations: {fmt(summary.deductibleVAT.fixedAssets.total)}</p>
                                </div>
                            </div>

                            {/* Solde */}
                            <div className={`p-4 rounded-lg border ${summary.vatDue > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                {summary.vatDue > 0 ? (
                                    <>
                                        <p className="text-sm font-medium text-red-800">TVA à Payer</p>
                                        <p className="text-2xl font-bold text-red-900">{fmt(summary.vatDue)}</p>
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
                    <h3 className="text-sm font-semibold text-gray-700">Aperçu de la déclaration</h3>
                </CardHeader>
                <CardBody className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Ligne</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Opérations</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500">Montant TVA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr className="font-semibold text-gray-800"><td colSpan="3" className="px-4 py-2 bg-gray-100">TVA BRUTE</td></tr>
                            <tr>
                                <td className="px-4 py-3 text-gray-500">08</td>
                                <td className="px-4 py-3">Opérations imposables (TVA collectée)</td>
                                <td className="px-4 py-3 text-right font-medium">{fmt(summary?.collectedVAT.total)}</td>
                            </tr>
                            <tr className="font-semibold text-gray-800"><td colSpan="3" className="px-4 py-2 bg-gray-100">TVA DÉDUCTIBLE</td></tr>
                            <tr>
                                <td className="px-4 py-3 text-gray-500">19</td>
                                <td className="px-4 py-3">Sur immobilisations</td>
                                <td className="px-4 py-3 text-right font-medium">{fmt(summary?.deductibleVAT.fixedAssets.total)}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 text-gray-500">20</td>
                                <td className="px-4 py-3">Sur autres biens et services</td>
                                <td className="px-4 py-3 text-right font-medium">{fmt(summary?.deductibleVAT.goodsAndServices.total)}</td>
                            </tr>
                            <tr className="font-semibold bg-gray-50">
                                <td className="px-4 py-3" colSpan="2">TOTAL TVA DÉDUCTIBLE</td>
                                <td className="px-4 py-3 text-right font-bold">{fmt(summary?.deductibleVAT.total)}</td>
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