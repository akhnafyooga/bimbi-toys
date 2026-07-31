"use client";

import { useEffect, useRef, useState } from "react";

// Decorative toy emoji scattered down the page, floating *over* the content.
// They sit invisible until the scroll position brings them into the middle
// band of the viewport, then they pop in — and fade back out once they leave.
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

// Kept below the ~40%-of-viewport trigger band, so scrolling rarely lands in
// a gap with nothing popped.
const ROW_GAP = 240; // target px between one emoji and the next, going down
const MAX_TOYS = 36; // ceiling: past this it costs paint time and reads as clutter

function buildItems(count: number) {
  return Array.from({ length: count }, (_, i) => {
    // Alternate sides so the emoji hug the outer edges of the page instead of
    // sitting on top of product titles and prices in the middle.
    const jitter = rand(i + 1);
    const left = i % 2 === 0 ? 1 + jitter * 20 : 79 + jitter * 20;
    return {
      emoji: TOYS[i % TOYS.length],
      left,
      // Percentage of page height: the field stays evenly spread whether the
      // page is one screen tall or a 13,000px catalogue.
      top: ((i + 0.5) / count) * 100 + (rand(i + 100) - 0.5) * (60 / count),
      size: 26 + rand(i + 200) * 26,
      tilt: -20 + rand(i + 300) * 40,
      delay: rand(i + 400) * 120,
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
      setCount(Math.max(6, Math.min(MAX_TOYS, Math.round(h / ROW_GAP))));
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

  useEffect(() => {
    const root = ref.current;
    if (!root || count === 0) return;

    const nodes = [...root.querySelectorAll<HTMLElement>(".toy-pop")];
    let last = 0;

    // An emoji is "at" the scroll position when it sits in the middle 40% of
    // the viewport — that band is what makes it pop as you reach it rather
    // than as soon as it appears at the bottom edge.
    const sync = () => {
      const top = window.innerHeight * 0.3;
      const bottom = window.innerHeight * 0.7;
      // Read every rect first, then write every class, so the loop can't
      // thrash layout by interleaving measures and mutations.
      const hits = nodes.map((n) => {
        const r = n.getBoundingClientRect();
        const y = r.top + r.height / 2;
        return y > top && y < bottom;
      });
      nodes.forEach((n, i) => n.classList.toggle("toy-popped", hits[i]));
    };

    // Time-based throttle rather than requestAnimationFrame: this still runs
    // at most ~10x/second while scrolling, and keeps working in backgrounded
    // tabs where rAF is suspended.
    // The trailing call matters: without it, a scroll that ends inside the
    // throttle window leaves the last position unprocessed.
    let trailing: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(trailing);
      trailing = setTimeout(sync, 120);
      const now = Date.now();
      if (now - last < 100) return;
      last = now;
      sync();
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      clearTimeout(trailing);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
    >
      {buildItems(count).map((item, i) => (
        <span
          key={i}
          className="toy-pop absolute"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            fontSize: `${item.size}px`,
            lineHeight: 1,
            transitionDelay: `${item.delay}ms`,
            ["--toy-tilt" as string]: `${item.tilt}deg`,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
