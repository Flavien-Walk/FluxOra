'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import GlobalSearch from '@/components/ui/GlobalSearch';

export default function Header({ title, subtitle, actions }) {
  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center gap-4 px-6 flex-shrink-0">
      {/* Left: page title */}
      <div className="min-w-0 w-40 flex-shrink-0">
        <h1 className="text-sm font-semibold text-slate-900 truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Center: global search */}
      <div className="flex-1 flex justify-center">
        <GlobalSearch />
      </div>

      {/* Right: actions + notifications + user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        <button className={cn(
          'w-8 h-8 flex items-center justify-center rounded-lg',
          'text-slate-400 hover:text-slate-600 hover:bg-slate-50',
          'transition-colors duration-150'
        )}>
          <Bell size={15} />
        </button>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
