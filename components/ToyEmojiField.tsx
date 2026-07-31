"use client";

import { useEffect, useRef, useState } from "react";

// Decorative toy emoji scattered down the page, floating over the content.
// Always visible — no scroll animation.
//
// They deliberately ride above the page rather than behind it: product cards
// and section backgrounds are fully opaque, so a layer underneath them is
// never seen. Kept at low opacity and pointer-events-none so nothing is
// obscured and nothing becomes unclickable.

const TOYS = [
  "🧸", "🚗", "🎈", "🪀", "🧩", "🎨", "🚂", "🪁", "⚽", "🎲",
  "🤖", "🦖", "🚀", "🎁", "🛴", "🪆", "🎠", "🥁", "✏️", "🧱",
];

// Deterministic pseudo-random, so a given slot always draws the same toy in
// the same spot — re-measuring on resize must not reshuffle the whole field.
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const ROW_GAP = 320; // target px between one emoji and the next, going down
const MAX_TOYS = 28; // ceiling: past this it costs paint time and reads as clutter

function buildItems(count: number) {
  return Array.from({ length: count }, (_, i) => {
    // Alternate sides so the emoji hug the outer edges of the page instead of
    // sitting on top of product titles and prices in the middle.
    const jitter = rand(i + 1);
    const left = i % 2 === 0 ? 7 + jitter * 16 : 77 + jitter * 16;
    return {
      emoji: TOYS[i % TOYS.length],
      left,
      // Percentage of page height: the field stays evenly spread whether the
      // page is one screen tall or a 13,000px catalogue.
      top: ((i + 0.5) / count) * 100 + (rand(i + 100) - 0.5) * (60 / count),
      // Unitless — globals.css multiplies it down on smaller screens, where a
      // desktop-sized emoji would swamp the layout.
      size: Math.round(52 + rand(i + 200) * 44),
      tilt: -20 + rand(i + 300) * 40,
    };
  });
}

export default function ToyEmojiField() {
  const ref = useRef<HTMLDivElement>(null);
  // Server renders an empty layer; the count depends on the measured page
  // height, so the emoji are filled in on the client only. (Rendering them on
  // the server instead would mismatch on hydration.)
  const [count, setCount] = useState(0);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // A ResizeObserver here fires on every image that finishes loading and
    // grows the page, re-rendering the whole field each time. Measuring after
    // load plus on debounced window resizes is enough and far cheaper.
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const h = root.offsetHeight;
      setCount(Math.max(5, Math.min(MAX_TOYS, Math.round(h / ROW_GAP))));
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 200);
    };

    measure();
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
    >
      {buildItems(count).map((item, i) => (
        <span
          key={i}
          className="toy-emoji absolute"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            ["--toy-size" as string]: item.size,
            ["--toy-tilt" as string]: `${item.tilt}deg`,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
