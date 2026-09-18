export type DiscoveryLimits = {
  navigationTimeoutMs: number;
  totalTimeoutMs: number;
  actionTimeoutMs: number;
  settleMs: number;
  maxStates: number;
  maxActions: number;
  maxCarouselSlides: number;
  maxTabs: number;
};

export const DEFAULT_DISCOVERY_LIMITS: DiscoveryLimits = {
  navigationTimeoutMs: 15_000,
  totalTimeoutMs: 45_000,
  actionTimeoutMs: 3_000,
  settleMs: 800,
  maxStates: 16,
  maxActions: 24,
  maxCarouselSlides: 8,
  maxTabs: 8,
};
