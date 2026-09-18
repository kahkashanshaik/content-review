import type { PageStateType } from "../../domain/types.ts";
import type { Result } from "../../domain/errors.ts";

export type UnsupportedDynamicKind = "websocket" | "authentication" | "payment" | "complex";

export type UnsupportedDynamicSignal = {
  kind: UnsupportedDynamicKind;
  message: string;
};

export type DiscoveredStateCapture = {
  type: PageStateType;
  key: string;
  label?: string;
  html: string;
};

export type DynamicDiscoveryResult = {
  finalUrl: string;
  captures: DiscoveredStateCapture[];
  unsupported: UnsupportedDynamicSignal[];
};

export type DynamicDiscoveryRequest =
  | { source: "url"; url: string }
  | { source: "html"; html: string; baseUrl: string };

export interface DynamicDiscoverer {
  discover(request: DynamicDiscoveryRequest): Promise<Result<DynamicDiscoveryResult>>;
}
