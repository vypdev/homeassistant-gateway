import type { OperatorService, OperatorServicePolicy } from './models';

export const toggleOperatorServiceSelection = (
  selected: Iterable<string>,
  service: string,
  checked: boolean,
) => {
  const next = new Set(selected);
  if (checked) next.add(service); else next.delete(service);
  return [...next].sort();
};

export const toggleOperatorServiceGroupSelection = (
  selected: Iterable<string>,
  services: Iterable<string>,
  checked: boolean,
) => {
  const next = new Set(selected);
  for (const service of services) {
    if (checked) next.add(service); else next.delete(service);
  }
  return [...next].sort();
};

export const selectedOperatorServices = (policy: OperatorServicePolicy | null) =>
  policy?.services.filter((service: OperatorService) => policy.selected.includes(service.id)) ?? [];
