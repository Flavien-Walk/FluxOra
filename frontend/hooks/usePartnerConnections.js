'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'fluxora_partner_connections';

export function usePartnerConnections() {
  const [connections, setConnections] = useState(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setConnections(new Set(saved));
    } catch {}
  }, []);

  const connect = useCallback((partnerId) => {
    setConnections((prev) => {
      const next = new Set(prev);
      next.add(partnerId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const disconnect = useCallback((partnerId) => {
    setConnections((prev) => {
      const next = new Set(prev);
      next.delete(partnerId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isConnected = useCallback(
    (partnerId) => connections.has(partnerId),
    [connections]
  );

  return { connections, connect, disconnect, isConnected };
}
