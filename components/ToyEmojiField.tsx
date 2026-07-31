"use client";

import { useEffect, useRef, useState } from "react";

// Decorative toy emoji scattered down the page behind the content.
// They sit invisible until the scroll position brings them into the middle
// band of the viewport, then they pop in — and fade back out once they leave.
// Purely ornamental: aria-hidden and pointer-events-none throughout.

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

const ROW_GAP = 260; // target px between one emoji and the next, going down

function buildItems(count: number) {
  return Array.from({ length: count }, (_, i) => {
    // Alternate sides so the two columns of emoji straddle the content
    // instead of piling up behind it, with enough jitter to avoid a grid look.
    const jitter = rand(i + 1);
    const left = i % 2 === 0 ? 1 + jitter * 26 : 73 + jitter * 26;
    return {
      emoji: TOYS[i % TOYS.length],
      left,
      // Percentage of page height: the field stays evenly spread whether the
      // page is one screen tall or a 13,000px catalogue.
      top: ((i + 0.5) / count) * 100 + (rand(i + 100) - 0.5) * (60 / count),
      size: 26 + rand(i + 200) * 30,
      tilt: -20 + rand(i + 300) * 40,
      delay: rand(i + 400) * 140,
    };
  });
}

export default function ToyEmojiField() {
  const ref = useRef<HTMLDivElement>(null);
  // Server renders an empty layer; the count depends on the measured page
  // height, so the emoji are filled in on the client only.
  const [count, setCount] = useState(0);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      const h = root.offsetHeight;
      setCount(Math.max(6, Math.min(80, Math.round(h / ROW_GAP))));
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root || count === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("toy-popped", entry.isIntersecting);
        }
      },
      // Shrinking the observation box to the middle 40% of the viewport is what
      // makes this fire on "the emoji is near my scroll position" rather than
      // "the emoji is somewhere on screen".
      { rootMargin: "-30% 0px -30% 0px", threshold: 0 }
    );

    root.querySelectorAll(".toy-pop").forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [count]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
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
