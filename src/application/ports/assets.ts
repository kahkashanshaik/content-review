import type { Result } from "../../domain/errors.ts";

export type FetchedStylesheet = {
  finalUrl: string;
  css: string;
};

export interface StylesheetFetcher {
  fetchStylesheet(url: string): Promise<Result<FetchedStylesheet>>;
}
