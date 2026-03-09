'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Header({ title, subtitle, actions }) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: page title */}
      <div className="min-w-0">
        <h1 className={cn(
          'font-semibold text-gray-900 truncate',
          subtitle ? 'text-sm' : 'text-sm'
        )}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right: actions + notifications + user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        <button className={cn(
          'w-8 h-8 flex items-center justify-center rounded-lg',
          'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
          'transition-colors duration-150'
        )}>
          <Bell size={16} />
        </button>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
