import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SyllabusPipelinePort } from './types';
import { mockAdapter } from './mockAdapter';
import { realAdapter } from './realAdapter';

const PipelineContext = createContext<SyllabusPipelinePort | null>(null);

const ENV_MOCK =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.VITE_MOCK_PIPELINE === 'true';

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();

  const adapter = useMemo<SyllabusPipelinePort>(() => {
    const param = searchParams.get('mock');
    if (param === 'true') return mockAdapter;
    if (param === 'false') return realAdapter;
    return ENV_MOCK ? mockAdapter : realAdapter;
  }, [searchParams]);

  return (
    <PipelineContext.Provider value={adapter}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline(): SyllabusPipelinePort {
  const ctx = useContext(PipelineContext);
  if (!ctx) {
    throw new Error('usePipeline must be used within a <PipelineProvider>');
  }
  return ctx;
}
