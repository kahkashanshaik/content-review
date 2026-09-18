import { segmentMixedText } from "../../domain/bidi.ts";
import type { TextDirection } from "../../domain/types.ts";

type DirectionalTextProps = {
  label: string;
  text: string;
  direction?: TextDirection;
  language?: string;
};

export function DirectionalText({ label, text, direction, language }: DirectionalTextProps) {
  const resolved = direction ?? "auto";
  const segments = segmentMixedText(text, resolved);
  const value = segments.map((segment, index) =>
    segment.dir === undefined ? (
      segment.text
    ) : (
      <bdi key={index} dir={segment.dir}>
        {segment.text}
      </bdi>
    ),
  );

  return (
    <p className="mt-1 text-sm text-stone-800" dir="ltr">
      <span className="text-stone-600">{label}:</span>{" "}
      {language === undefined ? (
        <span dir={resolved} style={{ unicodeBidi: "isolate" }}>
          {value}
        </span>
      ) : (
        <span dir={resolved} lang={language} style={{ unicodeBidi: "isolate" }}>
          {value}
        </span>
      )}
    </p>
  );
}
