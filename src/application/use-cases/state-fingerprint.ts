export function stateContentFingerprint(
  items: readonly { selector: string; text: string }[],
): string {
  return items
    .map((item) => `${item.selector}\t${item.text}`)
    .sort()
    .join("\n");
}
