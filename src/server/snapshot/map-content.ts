import type { ExtractedContentItem } from "../../application/ports/extractor.ts";
import type { MappedContentItem } from "../../application/ports/snapshot.ts";
import { CONTENT_ID_ATTRIBUTE, CONTENT_TYPE_ATTRIBUTE, type SnapshotDocument } from "./document.ts";

export function mapContentItems(
  document: SnapshotDocument,
  items: readonly ExtractedContentItem[],
): MappedContentItem[] {
  return items.map((item) => {
    const element = document.querySelector(item.selector);
    if (element === null) {
      return { ...item, mapped: false };
    }

    element.setAttribute(CONTENT_ID_ATTRIBUTE, item.id);
    element.setAttribute(CONTENT_TYPE_ATTRIBUTE, item.elementType);
    if (item.direction !== "auto" && !element.getAttribute("dir")) {
      element.setAttribute("dir", item.direction);
    }
    if (item.language !== undefined && !element.getAttribute("lang")) {
      element.setAttribute("lang", item.language);
    }
    return { ...item, mapped: true };
  });
}
