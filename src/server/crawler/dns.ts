import { lookup as dnsLookup } from "node:dns/promises";

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

export type LookupFn = (hostname: string) => Promise<ResolvedAddress[]>;

export async function nodeLookup(hostname: string): Promise<ResolvedAddress[]> {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map((record) => ({
    address: record.address,
    family: record.family === 6 ? 6 : 4,
  }));
}
