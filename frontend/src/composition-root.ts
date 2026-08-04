import { createGatewayApi, type GatewayApi } from './gateway-api';
import { createGatewayController, type GatewayController } from './gateway-controller';

type GatewayRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export interface GatewayAppDependencies {
  gatewayApi: GatewayApi;
  gatewayController: GatewayController;
}

export function createGatewayAppDependencies(request?: GatewayRequest): GatewayAppDependencies {
  const gatewayApi = request ? createGatewayApi(request) : createGatewayApi();
  return { gatewayApi, gatewayController: createGatewayController(gatewayApi) };
}
