export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;

export type HtmlNode = {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<HtmlNode>;
};

export type HtmlElement = HtmlNode & {
  tagName: string;
  getAttribute(name: string): string | null;
  parentElement: HtmlElement | null;
  children: ArrayLike<HtmlElement>;
};

export function isHtmlElement(node: HtmlNode): node is HtmlElement {
  return node.nodeType === ELEMENT_NODE && "tagName" in node;
}
