'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Header from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/lib/api';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { 
    FileText, Download, ChevronsLeft, ChevronsRight, 
    TrendingUp, TrendingDown, Info, AlertTriangle 
} from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR');

const getMonthRange = (year, month) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { 
        from: start.toISOString(), 
        to: end.toISOString(), 
        period: `${year}-${String(month).padStart(2, '0')}` 
    };
};

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function VATDashboardPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDetails, setShowDetails] = useState(false);

    const { from, to, period } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        return getMonthRange(year, month);
    }, [currentDate]);

    // Data fetching
    const { data: summary, error: summaryError, isLoading: loadingSummary } = useSWR(
        `/api/vat/summary?from=${from}&to=${to}`, fetcher
    );
    
    const { data: details, error: detailsError, isLoading: loadingDetails } = useSWR(
        showDetails ? `/api/vat/details?from=${from}&to=${to}` : null, fetcher
    );

    const periodLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate);

    const handleDownloadPDF = async () => {
        try {
            const response = await api.get(`/api/vat/pdf?from=${from}&to=${to}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `TVA_${period}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url); // Nettoyage
        } catch (e) {
            alert('Erreur lors du téléchargement du PDF');
        }
    };

    return (
        <>
            <Header title="Déclaration TVA" />
            <div className="flex-1 p-6 space-y-6">
                
                {/* Contrôles Période & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
                        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><ChevronsLeft size={18} /></Button>
                        <span className="w-32 text-center font-semibold text-gray-700 capitalize">{periodLabel}</span>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><ChevronsRight size={18} /></Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowDetails(!showDetails)}>
                            <FileText size={16} className="mr-2" />
                            {showDetails ? 'Masquer détails' : 'Voir les opérations'}
                        </Button>
                        <Button onClick={handleDownloadPDF}>
                            <Download size={16} className="mr-2" />
                            Télécharger PDF
                        </Button>
                    </div>
                </div>

                {/* Résumé des Cartes */}
                {summaryError ? (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        <p>Impossible de charger le résumé de TVA. Vérifiez que le Backend est lancé et accessible.</p>
                    </div>
                ) : loadingSummary ? <SkeletonTable rows={1} cols={3} /> : summary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-l-4 border-l-blue-500">
                            <CardBody>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-1">TVA Collectée (Ventes)</p>
                                        <h3 className="text-2xl font-bold text-gray-900">{fmt(summary.collectedVAT.total)}</h3>
                                    </div>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={20} /></div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="border-l-4 border-l-indigo-500">
                            <CardBody>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-1">TVA Déductible (Achats)</p>
                                        <h3 className="text-2xl font-bold text-gray-900">{fmt(summary.deductibleVAT.total)}</h3>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Dont immo: {fmt(summary.deductibleVAT.fixedAssets.total)}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><TrendingDown size={20} /></div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className={`border-l-4 ${summary.vatDue > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
                            <CardBody>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 mb-1">
                                            {summary.vatDue > 0 ? 'TVA à Payer' : 'Crédit de TVA'}
                                        </p>
                                        <h3 className={`text-2xl font-bold ${summary.vatDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {fmt(summary.vatDue > 0 ? summary.vatDue : summary.vatCredit)}
                                        </h3>
                                    </div>
                                    <div className={`p-2 rounded-lg ${summary.vatDue > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        <Info size={20} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                )}

                {/* Tableau détaillé (Conditionnel) */}
                {showDetails && (
                    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <CardHeader><h3 className="font-semibold text-gray-800">Détail des opérations ({periodLabel})</h3></CardHeader>
                        <CardBody className="p-0">
                            {detailsError ? (
                                <div className="p-4 text-red-600 flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    Erreur de chargement des détails.
                                </div>
                            ) : loadingDetails ? <SkeletonTable rows={5} cols={6} /> : (
                                <div className="overflow-x-auto max-h-[500px]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Date</th>
                                                <th className="px-4 py-3 font-medium">Type</th>
                                                <th className="px-4 py-3 font-medium">Tiers</th>
                                                <th className="px-4 py-3 font-medium text-right">HT</th>
                                                <th className="px-4 py-3 font-medium text-right">TVA</th>
                                                <th className="px-4 py-3 font-medium text-right">TTC</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {details?.operations?.length > 0 ? details.operations.map((op) => (
                                                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-600">{fmtDate(op.date)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                            op.type === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                            {op.type === 'sale' ? 'Vente' : 'Achat'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-900">{op.thirdParty}</td>
                                                    <td className="px-4 py-3 text-right text-gray-600">{fmt(op.amountHT)}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(op.vatAmount)}</td>
                                                    <td className="px-4 py-3 text-right text-gray-500">{fmt(op.amountTTC)}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="6" className="text-center py-8 text-gray-400">Aucune opération sur cette période.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}
            </div>
        </>
    );
}
