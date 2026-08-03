import type { DevelopmentReport, DevelopmentResult, HealthDetails } from './models';
import { isProblemStatus } from './view-helpers';

export const downloadDiagnostic = (health: HealthDetails, results: DevelopmentResult[], reports: DevelopmentReport[]): void => {
  const payload = { generated_at: new Date().toISOString(), health, results, reports: reports.slice(0, 10) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `homeassistant-gateway-diagnostic-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const copyDiagnostic = async (result: DevelopmentResult): Promise<void> => {
  await navigator.clipboard?.writeText(JSON.stringify({ operation: result.operation, status: result.status, reason: result.reason ?? null, details: result.details ?? null, trace: result.trace ?? [] }, null, 2));
};

export const copyProblemReports = async (results: DevelopmentResult[]): Promise<void> => {
  const problems = results.filter((result) => isProblemStatus(result.status));
  const payload = {
    generated_at: new Date().toISOString(),
    count: problems.length,
    reports: problems,
  };
  await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
};
