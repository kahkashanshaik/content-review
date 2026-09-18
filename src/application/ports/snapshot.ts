import type { Result } from "../../domain/errors.ts";
import type { TextDirection } from "../../domain/types.ts";
import type { ExtractedContentItem } from "./extractor.ts";

export type MappedContentItem = ExtractedContentItem & {
  mapped: boolean;
};

export type BuiltSnapshot = {
  sanitizedHtml: string;
  documentDirection: TextDirection;
  documentLanguage?: string;
  title?: string;
  items: MappedContentItem[];
};

export type SnapshotBuildInput = {
  html: string;
  baseUrl: string;
  items: readonly ExtractedContentItem[];
  documentDirection: TextDirection;
  documentLanguage?: string;
  title?: string;
};

export interface SnapshotBuilder {
  build(input: SnapshotBuildInput): Promise<Result<BuiltSnapshot>>;
}
