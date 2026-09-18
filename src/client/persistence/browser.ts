import type { Repositories } from "../../application/ports/repositories.ts";
import { createContentReviewDatabase } from "./dexie/database.ts";
import { createDexieRepositories } from "./dexie/create-repositories.ts";

let browserRepositories: Repositories | undefined;

export function getBrowserRepositories(): Repositories {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB repositories are only available in the browser.");
  }

  if (browserRepositories === undefined) {
    browserRepositories = createDexieRepositories(createContentReviewDatabase());
  }

  return browserRepositories;
}
