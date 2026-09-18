import { SnapshotFrame } from "./snapshot-frame";

type IsolatedSnapshotProps = {
  sanitizedHtml: string;
  title?: string;
};

export function IsolatedSnapshot({ sanitizedHtml, title }: IsolatedSnapshotProps) {
  return (
    <div className="grid gap-2">
      <p className="text-sm text-stone-600">
        Source scripts cannot run in this isolated snapshot. Application chrome stays outside
        the frame.
      </p>
      {title === undefined ? (
        <SnapshotFrame sanitizedHtml={sanitizedHtml} sandbox="" />
      ) : (
        <SnapshotFrame sanitizedHtml={sanitizedHtml} title={title} sandbox="" />
      )}
    </div>
  );
}
