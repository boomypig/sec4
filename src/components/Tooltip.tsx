import { useState, useRef, useEffect, type ReactNode } from "react";

type Props = {
  content: string;
  children: ReactNode;
};

export default function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<"top" | "bottom">("top");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos(rect.top < 60 ? "bottom" : "top");
    }
  }, [show]);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          ref={ref}
          className={`absolute z-50 px-3 py-2 text-xs leading-relaxed text-on-surface bg-surface-container-highest border border-outline-variant/20 rounded-md shadow-lg w-[min(22rem,calc(100vw-2rem))] whitespace-normal break-words ${
            pos === "top"
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : "top-full mt-2 left-1/2 -translate-x-1/2"
          }`}
        >
          {content}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-container-highest border-outline-variant/20 rotate-45 ${
              pos === "top"
                ? "top-full -mt-1 border-r border-b"
                : "bottom-full -mb-1 border-l border-t"
            }`}
          />
        </div>
      )}
    </span>
  );
}

/* Pre-built tooltip labels for common financial terms */
export const TOOLTIPS = {
  form4:
    "A Form 4 is an SEC filing that company insiders (officers, directors, major shareholders) must submit when they buy or sell company stock.",
  shares:
    "The number of stock shares involved in this transaction. More shares = larger position change.",
  value:
    "The total dollar value of the transaction (shares x price per share).",
  bullish:
    "Bullish means more buying than selling by insiders, which can signal confidence in the company.",
  bearish:
    "Bearish means more selling than buying by insiders, which can signal caution about the company.",
  insider:
    "An insider is a company officer, director, or someone who owns more than 10% of the company's stock.",
} as const;
