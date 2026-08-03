import {
  loadDevelopmentReports,
  queueDevelopmentJob,
  watchDevelopmentJob,
  type DevelopmentJobSnapshot,
} from './development-service';

export type DevelopmentJobCallbacks = {
  onSnapshot: (snapshot: DevelopmentJobSnapshot) => void;
  onFinished: () => Promise<void>;
};

export async function executeDevelopmentJob(
  operation: string,
  parameters: Record<string, string>,
  callbacks: DevelopmentJobCallbacks,
): Promise<void> {
  const jobId = await queueDevelopmentJob(operation, parameters);
  await watchDevelopmentJob(jobId, callbacks);
}

export { loadDevelopmentReports };
