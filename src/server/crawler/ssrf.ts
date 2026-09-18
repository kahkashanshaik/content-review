import ipaddr from "ipaddr.js";

export type SsrfBlockReason =
  | "loopback"
  | "private"
  | "link-local"
  | "unique-local"
  | "cgnat"
  | "unspecified"
  | "multicast"
  | "reserved"
  | "metadata"
  | "hostname"
  | "transition";

export type IpInspection =
  | { blocked: false; address: string }
  | { blocked: true; address: string; reason: SsrfBlockReason };

const METADATA_IPV4 = new Set(["169.254.169.254", "169.254.170.2", "100.100.100.200"]);
const METADATA_IPV6 = new Set(["fd00:ec2:0:0:0:0:0:254"]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "metadata.google.com",
  "instance-data",
  "internal",
]);

const BLOCKED_IPV4_RANGES = new Set([
  "unspecified",
  "broadcast",
  "multicast",
  "linkLocal",
  "loopback",
  "reserved",
  "benchmarking",
  "carrierGradeNat",
  "private",
  "amt",
  "as112",
]);

const BLOCKED_IPV6_RANGES = new Set([
  "unspecified",
  "multicast",
  "linkLocal",
  "loopback",
  "reserved",
  "benchmarking",
  "uniqueLocal",
  "ipv4Mapped",
  "rfc6145",
  "rfc6052",
  "6to4",
  "teredo",
  "amt",
  "as112v6",
  "orchid2",
]);

export function normalizeHostname(hostname: string): string {
  return hostname.replace(/\.$/, "").toLowerCase();
}

export function isBlockedHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);

  if (BLOCKED_HOSTNAMES.has(host)) {
    return true;
  }

  return (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".metadata.google.internal")
  );
}

export function hostnameAsIp(hostname: string): string | undefined {
  const host = hostname.replace(/^\[|\]$/g, "");

  if (ipaddr.isValid(host)) {
    return canonicalIp(host);
  }

  if (/^\d+$/.test(host)) {
    const value = Number(host);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
      return undefined;
    }

    return [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ].join(".");
  }

  return undefined;
}

export function inspectIp(ip: string): IpInspection {
  let address: ipaddr.IPv4 | ipaddr.IPv6;

  try {
    address = ipaddr.parse(ip);
  } catch {
    return { blocked: true, address: ip, reason: "reserved" };
  }

  if (address.kind() === "ipv6") {
    const ipv6 = address as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) {
      return inspectIp(ipv6.toIPv4Address().toString());
    }

    const canonical = canonicalIp(ip);

    if (METADATA_IPV6.has(canonical) || METADATA_IPV6.has(ipv6.toNormalizedString())) {
      return { blocked: true, address: canonical, reason: "metadata" };
    }

    const range = ipv6.range();
    if (
      range === "ipv4Mapped" ||
      range === "teredo" ||
      range === "6to4" ||
      range === "rfc6052" ||
      range === "rfc6145"
    ) {
      return { blocked: true, address: canonical, reason: "transition" };
    }

    return blockedRange(canonical, range, BLOCKED_IPV6_RANGES);
  }

  const ipv4 = address as ipaddr.IPv4;
  const canonical = canonicalIp(ip);

  if (METADATA_IPV4.has(canonical)) {
    return { blocked: true, address: canonical, reason: "metadata" };
  }

  if (ipv4.octets[0] === 0) {
    return { blocked: true, address: canonical, reason: "unspecified" };
  }

  return blockedRange(canonical, ipv4.range(), BLOCKED_IPV4_RANGES);
}

export function isBlockedIp(ip: string): boolean {
  return inspectIp(ip).blocked;
}

function blockedRange(
  address: string,
  range: string,
  blocked: ReadonlySet<string>,
): IpInspection {
  if (!blocked.has(range) && range === "unicast") {
    return { blocked: false, address };
  }

  if (!blocked.has(range)) {
    return { blocked: true, address, reason: "reserved" };
  }

  return { blocked: true, address, reason: reasonFromRange(range) };
}

function reasonFromRange(range: string): SsrfBlockReason {
  switch (range) {
    case "loopback":
      return "loopback";
    case "private":
      return "private";
    case "linkLocal":
      return "link-local";
    case "uniqueLocal":
      return "unique-local";
    case "carrierGradeNat":
      return "cgnat";
    case "unspecified":
      return "unspecified";
    case "multicast":
    case "broadcast":
      return "multicast";
    case "ipv4Mapped":
    case "teredo":
    case "6to4":
    case "rfc6052":
    case "rfc6145":
      return "transition";
    default:
      return "reserved";
  }
}

function canonicalIp(ip: string): string {
  const address = ipaddr.parse(ip);
  if (address.kind() === "ipv6") {
    const ipv6 = address as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) {
      return ipv6.toIPv4Address().toString();
    }
  }

  return address.toString();
}
