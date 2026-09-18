import { ERROR_CODES, type Result } from "../../domain/errors.ts";
import type { LookupFn, ResolvedAddress } from "./dns.ts";
import { crawlerError, DEFAULT_CRAWLER_LIMITS, ssrfBlocked, type CrawlerLimits } from "./limits.ts";
import { hostnameAsIp, inspectIp } from "./ssrf.ts";
import { inspectUrlTarget, parseCrawlUrl } from "./url.ts";

export type AuthorizedTarget = {
  url: URL;
  pinnedAddress: string;
  family: 4 | 6;
  addresses: readonly ResolvedAddress[];
};

export async function authorizeUrl(
  input: string,
  lookup: LookupFn,
  limits: CrawlerLimits = DEFAULT_CRAWLER_LIMITS,
): Promise<Result<AuthorizedTarget>> {
  const parsed = parseCrawlUrl(input, limits);
  if (!parsed.ok) {
    return parsed;
  }

  const targeted = inspectUrlTarget(parsed.value);
  if (!targeted.ok) {
    return targeted;
  }

  const url = targeted.value;
  const literalIp = hostnameAsIp(url.hostname);

  if (literalIp !== undefined) {
    return authorizedFromAddresses(url, [
      {
        address: literalIp,
        family: familyOf(literalIp),
      },
    ]);
  }

  let resolved: ResolvedAddress[];
  try {
    resolved = await lookup(url.hostname);
  } catch {
    return crawlerError(
      ERROR_CODES.FETCH_FAILED,
      "The hostname could not be resolved.",
      { hostname: url.hostname },
    );
  }

  return authorizedFromAddresses(url, resolved);
}

function authorizedFromAddresses(
  url: URL,
  resolved: readonly ResolvedAddress[],
): Result<AuthorizedTarget> {
  if (resolved.length === 0) {
    return crawlerError(
      ERROR_CODES.FETCH_FAILED,
      "The hostname could not be resolved.",
      { hostname: url.hostname },
    );
  }

  const allowed: ResolvedAddress[] = [];

  for (const record of resolved) {
    const inspection = inspectIp(record.address);
    if (inspection.blocked) {
      return ssrfBlocked("DNS resolution returned a blocked address.", {
        reason: inspection.reason,
        hostname: url.hostname,
      });
    }

    allowed.push({
      address: inspection.address,
      family: familyOf(inspection.address),
    });
  }

  const pinned = allowed[0];
  if (pinned === undefined) {
    return ssrfBlocked("DNS resolution returned a blocked address.", {
      reason: "private",
      hostname: url.hostname,
    });
  }

  return {
    ok: true,
    value: {
      url,
      pinnedAddress: pinned.address,
      family: pinned.family,
      addresses: allowed,
    },
  };
}

function familyOf(ip: string): 4 | 6 {
  return ip.includes(":") ? 6 : 4;
}
