"use client";

import { useEffect, useRef } from "react";

/** Ancre placée en fin de fil : fait défiler jusqu'au dernier message à l'ouverture et à chaque nouveau message. */
export function ThreadAutoScroll({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "end", behavior: first.current || reduce ? "auto" : "smooth" });
    first.current = false;
  }, [count]);

  return <div ref={ref} aria-hidden="true" className="scroll-mb-44" />;
}
