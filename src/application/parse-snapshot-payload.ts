import type {
  PersistCrawledPageInput,
  PersistablePageState,
} from "./use-cases/persist-crawled-page.ts";
import {
  EXTRACTABLE_ELEMENT_TYPES,
  PAGE_STATE_TYPES,
  type ExtractableElementType,
  type PageStateType,
  type TextDirection,
} from "../domain/types.ts";

const DIRECTIONS = new Set<TextDirection>(["ltr", "rtl", "auto"]);
const ELEMENT_TYPES = new Set<string>(EXTRACTABLE_ELEMENT_TYPES);
const STATE_TYPES = new Set<string>(PAGE_STATE_TYPES);

export function readSnapshotPayload(body: unknown): PersistCrawledPageInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.sanitizedHtml !== "string" || record.sanitizedHtml.length === 0) {
    return undefined;
  }

  const sourceUrl = typeof record.finalUrl === "string" ? record.finalUrl : undefined;
  if (sourceUrl === undefined) {
    return undefined;
  }

  const items = readItems(record.items);
  if (items === undefined) {
    return undefined;
  }

  const title = typeof record.title === "string" && record.title.trim() !== "" ? record.title : undefined;
  const states = readStates(record.states);
  const unsupported = readUnsupported(record.unsupported);

  return {
    projectId: "",
    sourceUrl,
    sanitizedHtml: record.sanitizedHtml,
    items,
    ...(title === undefined ? {} : { title }),
    ...(states === undefined ? {} : { states }),
    ...(unsupported === undefined ? {} : { unsupported }),
  };
}

function readStates(value: unknown): PersistablePageState[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const states: PersistablePageState[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return undefined;
    }

    const state = entry as Record<string, unknown>;
    if (
      typeof state.key !== "string" ||
      state.key.trim() === "" ||
      typeof state.sanitizedHtml !== "string" ||
      state.sanitizedHtml.length === 0 ||
      typeof state.type !== "string" ||
      !STATE_TYPES.has(state.type)
    ) {
      return undefined;
    }

    const items = readItems(state.items);
    if (items === undefined) {
      return undefined;
    }

    const label = typeof state.label === "string" && state.label.trim() !== "" ? state.label : undefined;

    states.push({
      type: state.type as PageStateType,
      key: state.key,
      sanitizedHtml: state.sanitizedHtml,
      items,
      ...(label === undefined ? {} : { label }),
    });
  }

  return states;
}

function readUnsupported(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const messages: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim() !== "") {
      messages.push(entry);
      continue;
    }
    if (typeof entry === "object" && entry !== null && "message" in entry) {
      const message = (entry as { message: unknown }).message;
      if (typeof message === "string" && message.trim() !== "") {
        messages.push(message);
      }
    }
  }

  return messages.length > 0 ? messages : undefined;
}

function readItems(value: unknown): PersistCrawledPageInput["items"] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items: PersistCrawledPageInput["items"][number][] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return undefined;
    }

    const item = entry as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.text !== "string" ||
      typeof item.selector !== "string" ||
      typeof item.order !== "number" ||
      typeof item.elementType !== "string" ||
      typeof item.direction !== "string" ||
      !ELEMENT_TYPES.has(item.elementType) ||
      !DIRECTIONS.has(item.direction as TextDirection)
    ) {
      return undefined;
    }

    const language =
      typeof item.language === "string" && item.language.trim() !== "" ? item.language : undefined;

    items.push({
      id: item.id,
      elementType: item.elementType as ExtractableElementType,
      text: item.text,
      selector: item.selector,
      direction: item.direction as TextDirection,
      order: item.order,
      mapped: item.mapped !== false,
      ...(language === undefined ? {} : { language }),
    });
  }

  return items;
}
