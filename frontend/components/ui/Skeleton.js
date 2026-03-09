import { cn } from '@/lib/utils';

/* ─── Bloc générique ────────────────────────────────────── */
export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

/* ─── Skeleton de card KPI ──────────────────────────────── */
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-7 w-28 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/* ─── Skeleton de ligne de table ────────────────────────── */
export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className={`h-4 ${i === 0 ? 'w-20' : i === 1 ? 'w-36' : 'w-16'}`} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Skeleton de table complète ────────────────────────── */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-card">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex gap-8">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-12' : i === 1 ? 'w-24' : 'w-16'}`} />
        ))}
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Skeleton de page (dashboard) ─────────────────────── */
export function SkeletonPage() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 h-52" />
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-52" />
      </div>
    </div>
  );
}
