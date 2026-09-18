import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function resolveChromiumExecutable(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }

  const roots = [join(homedir(), ".cache/ms-playwright")];
  if (existsSync("/tmp/cursor-sandbox-cache")) {
    roots.push("/tmp/cursor-sandbox-cache");
  }
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH?.trim();
  if (browsersPath) {
    roots.push(browsersPath);
  }

  for (const root of roots) {
    const found = findFile(root, "chrome-linux64/chrome", 5);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function findFile(root: string, suffix: string, depth: number): string | undefined {
  if (depth < 0 || !existsSync(root)) {
    return undefined;
  }

  const direct = join(root, suffix);
  if (existsSync(direct)) {
    return direct;
  }

  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    const path = join(root, entry);
    let stats;
    try {
      stats = statSync(path);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      const nested = findFile(path, suffix, depth - 1);
      if (nested !== undefined) {
        return nested;
      }
    }
  }

  return undefined;
}
