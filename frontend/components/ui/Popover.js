'use client';

import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const PopoverContext = createContext();

export function Popover({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        contentRef.current &&
        !contentRef.current.contains(event.target)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <PopoverContext.Provider value={{ isOpen, toggle, close, triggerRef, contentRef }}>
      <div className="relative">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ children }) {
  const { toggle, triggerRef } = useContext(PopoverContext);
  return (
    <div ref={triggerRef} onClick={toggle} className="cursor-pointer">
      {children}
    </div>
  );
}

export function PopoverContent({ children, className, align = 'start', sideOffset = 8 }) {
  const { isOpen, contentRef } = useContext(PopoverContext);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 mt-2 w-auto rounded-xl bg-white border border-gray-200 shadow-lg animate-in fade-in-0 zoom-in-95',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
      style={{ top: `calc(100% + ${sideOffset}px)` }}
    >
      {children}
    </div>
  );
}
