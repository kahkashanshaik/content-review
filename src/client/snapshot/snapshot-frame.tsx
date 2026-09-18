import type { Ref } from "react";

import { injectFreezeLayoutIntoHtml } from "@/server/snapshot/freeze-layout-css";

type SnapshotFrameProps = {
  sanitizedHtml: string;
  title?: string;
  sandbox: "" | "allow-same-origin";
  iframeRef?: Ref<HTMLIFrameElement>;
  onLoad?: () => void;
  className?: string;
};

export function SnapshotFrame({
  sanitizedHtml,
  title,
  sandbox,
  iframeRef,
  onLoad,
  className,
}: SnapshotFrameProps) {
  const label = title ?? "Isolated page snapshot";

  return (
    <iframe
      ref={iframeRef}
      title={label}
      sandbox={sandbox}
      srcDoc={injectFreezeLayoutIntoHtml(sanitizedHtml)}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      className={className ?? "h-[70vh] min-h-96 w-full border border-stone-300 bg-white"}
    />
  );
}
