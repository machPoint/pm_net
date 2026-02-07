"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DataMode = 'real' | 'fake-static' | 'fake-streaming';

interface DataModeContextType {
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  isUsingFakeData: boolean;
  isStreaming: boolean;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

const DATA_MODE_KEY = 'core_se_data_mode';

const getStoredDataMode = (): DataMode => {
  if (typeof window === 'undefined') return 'fake-static';
  const stored = localStorage.getItem(DATA_MODE_KEY);
  return (stored as DataMode) || 'fake-static'; // Default to fake-static for demo mode
};

const setStoredDataMode = (mode: DataMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DATA_MODE_KEY, mode);
};

export function DataModeProvider({ children }: { children: ReactNode }) {
  const [dataMode, setDataModeState] = useState<DataMode>('fake-static');

  // Initialize from localStorage
  useEffect(() => {
    const stored = getStoredDataMode();
    setDataModeState(stored);
  }, []);

  const setDataMode = (mode: DataMode) => {
    setDataModeState(mode);
    setStoredDataMode(mode);
  };

  const isUsingFakeData = dataMode !== 'real';
  const isStreaming = dataMode === 'fake-streaming';

  const value: DataModeContextType = {
    dataMode,
    setDataMode,
    isUsingFakeData,
    isStreaming,
  };

  return (
    <DataModeContext.Provider value={value}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  const context = useContext(DataModeContext);
  if (context === undefined) {
    throw new Error('useDataMode must be used within a DataModeProvider');
  }
  return context;
}
