export type OperationState =
  | { status: 'idle' }
  | { status: 'running'; operation: string }
  | { status: 'success'; operation: string }
  | { status: 'error'; operation: string; error: unknown };

export interface OperationRunner {
  readonly state: OperationState;
  run<T>(operation: string, task: () => Promise<T>): Promise<T>;
}

export function createOperationRunner(onState?: (state: OperationState) => void): OperationRunner {
  let state: OperationState = { status: 'idle' };
  const publish = (next: OperationState) => { state = next; onState?.(next); };
  return {
    get state() { return state; },
    async run<T>(operation: string, task: () => Promise<T>) {
      publish({ status: 'running', operation });
      try {
        const result = await task();
        publish({ status: 'success', operation });
        return result;
      } catch (error) {
        publish({ status: 'error', operation, error });
        throw error;
      }
    },
  };
}
