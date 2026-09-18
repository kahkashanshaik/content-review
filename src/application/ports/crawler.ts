import type { AppError, Result } from "../../domain/errors.ts";

export type CrawlRequest = {
  url: string;
};

export type FetchedPage = {
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
  byteLength: number;
};

export type CrawlSuccess = FetchedPage;

export type CrawlResult = Result<FetchedPage, AppError>;

export interface Crawler {
  crawl(request: CrawlRequest): Promise<CrawlResult>;
}
