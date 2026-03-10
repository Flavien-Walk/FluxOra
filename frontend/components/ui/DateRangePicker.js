'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';

export function DateRangePicker({ className, range, onSelectRange }) {

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !range && 'text-gray-500'
            )}
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
              <span>Choisissez une période</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <style>{`.rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f8fafc; }`}</style>
          <DayPicker
            locale={fr}
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={onSelectRange}
            numberOfMonths={2}
            className="rounded-md border bg-white p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
