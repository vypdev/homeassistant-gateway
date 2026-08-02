import { api } from './api';
import type { DevelopmentReport, DevelopmentResult } from './models';

export type DevelopmentJobSnapshot = {
  status: string;
  results: DevelopmentResult[];
  progress: number;
  completed: number;
  total: number;
};

type WatchCallbacks = {
  onSnapshot: (snapshot: DevelopmentJobSnapshot) => void;
  onFinished: () => Promise<void>;
};

export const loadDevelopmentReports = async (): Promise<DevelopmentReport[]> =>
  api<DevelopmentReport[]>('/development/reports');

export const watchDevelopmentJob = async (jobId: string, callbacks: WatchCallbacks): Promise<DevelopmentJobSnapshot> => {
  const startedAt = Date.now();
  let delay = 250;
  while (Date.now() - startedAt < 300_000) {
    const snapshot = await api<DevelopmentJobSnapshot>(`/development/jobs/${jobId}`);
    callbacks.onSnapshot(snapshot);
    if (['completed', 'warning', 'error'].includes(snapshot.status)) {
      await callbacks.onFinished();
      return snapshot;
    }
    await new Promise((resolve) => window.setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 1000);
  }
  throw new Error('development_job_timeout');
};

export const queueDevelopmentJob = async (operation: string, parameters: Record<string, string>): Promise<string> => {
  const queued = await api<{ job_id: string }>('/development/run', {
    method: 'POST',
    body: JSON.stringify({ operation, parameters }),
  });
  return queued.job_id;
};
