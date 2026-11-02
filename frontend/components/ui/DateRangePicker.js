'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

export function DateRangePicker({ className, range, onSelectRange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="w-[300px] justify-start text-left font-normal"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {range?.from ? (
          range.to ? (
            <>
              {format(range.from, 'd LLL y', { locale: fr })} -{' '}
              {format(range.to, 'd LLL y', { locale: fr })}
            </>
          ) : (
            format(range.from, 'd LLL y', { locale: fr })
          )
        ) : (
          <span className="text-gray-500">Choisissez une période</span>
        )}
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 rounded-md border bg-white shadow-lg">
          <style>{`.rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f8fafc; }`}</style>
          <DayPicker
            locale={fr}
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={(r) => { onSelectRange(r); if (r?.to) setOpen(false); }}
            numberOfMonths={2}
            className="p-3"
          />
        </div>
      )}
    </div>
  );
}
