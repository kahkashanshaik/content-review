export type { Crawler, CrawlRequest, CrawlResult, CrawlSuccess, FetchedPage } from "./ports/crawler.ts";
export type {
  ContentExtractor,
  ExtractedContentItem,
  ExtractedPageContent,
  ExtractOptions,
} from "./ports/extractor.ts";
export type {
  ContentChangeRepository,
  ContentItemRepository,
  PageRepository,
  PageSnapshotRepository,
  PageStateRepository,
  ProjectRepository,
  Repositories,
  RevisionRepository,
} from "./ports/repositories.ts";
export { createPage, type CreatePageInput } from "./use-cases/create-page.ts";
export {
  createProject,
  type CreateProjectInput,
} from "./use-cases/create-project.ts";
export { requestCrawl, type RequestCrawlInput } from "./use-cases/request-crawl.ts";
export {
  crawlAndExtract,
  type CrawlExtraction,
} from "./use-cases/crawl-and-extract.ts";
export {
  crawlAndSnapshot,
  type CrawlSnapshot,
} from "./use-cases/crawl-and-snapshot.ts";
export type { StylesheetFetcher, FetchedStylesheet } from "./ports/assets.ts";
export type {
  BuiltSnapshot,
  MappedContentItem,
  SnapshotBuilder,
  SnapshotBuildInput,
} from "./ports/snapshot.ts";
export {
  crawlAndDiscoverSnapshot,
  type CrawlDiscoverySnapshot,
  type DiscoveredSnapshotState,
} from "./use-cases/crawl-and-discover.ts";
export type { DynamicDiscoverer, DynamicDiscoveryRequest } from "./ports/discovery.ts";
export {
  persistCrawledPage,
  type PersistCrawledPageInput,
  type PersistablePageState,
  type PersistedCrawledPage,
} from "./use-cases/persist-crawled-page.ts";
export { loadReview, type ReviewPageData, type LoadReviewOptions, type ReviewChangeEntry } from "./use-cases/load-review.ts";
export { submitRevision, type SubmitRevisionInput, type SubmittedRevision } from "./use-cases/submit-revision.ts";
export {
  reviewChange,
  REVIEW_DECISIONS,
  type ReviewChangeInput,
  type ReviewDecision,
  type ReviewedChange,
} from "./use-cases/review-change.ts";
export {
  saveContentEdit,
  normalizeEditedText,
  MAX_EDITED_TEXT_LENGTH,
  type SaveContentEditInput,
  type SavedContentEdit,
} from "./use-cases/save-content-edit.ts";
