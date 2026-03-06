'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';

export default function Header({ title }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
