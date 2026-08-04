export interface OperatorPolicyService {
  save(selected: readonly string[]): Promise<void>;
}

export function createOperatorPolicyService(savePolicy: (selected: string[]) => Promise<void>): OperatorPolicyService {
  let queue = Promise.resolve();
  return {
    save(selected) {
      const snapshot = [...selected];
      const result = queue.then(() => savePolicy(snapshot));
      queue = result.catch(() => undefined);
      return result;
    },
  };
}
