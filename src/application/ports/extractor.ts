import type {
  ExtractableElementType,
  TextDirection,
} from "../../domain/types.ts";
import type { Result } from "../../domain/errors.ts";

export type ExtractedContentItem = {
  id: string;
  elementType: ExtractableElementType;
  text: string;
  selector: string;
  direction: TextDirection;
  language?: string;
  order: number;
};

export type ExtractedPageContent = {
  title?: string;
  documentDirection: TextDirection;
  documentLanguage?: string;
  items: ExtractedContentItem[];
};

export type ExtractOptions = {
  idNamespace?: string;
};

export interface ContentExtractor {
  extract(html: string, options?: ExtractOptions): Result<ExtractedPageContent>;
}
