"use client";

import { useEffect, useRef, useState } from "react";
import "./IntroOverlay.css";

const SESSION_KEY = "bimbi-intro-shelf-seen";

// One-shot onboarding veil over the free-roam shelf board: freezes the page,
// holds a 3s read window, then dissolves on the first touch/wheel input.
// Renders null once dismissed; all listeners/timers/body-lock are cleaned up.
//
// Shown once per session: the seen-flag lives in sessionStorage, and the
// check runs in an effect — so this renders nothing on the server and after
// hydration, avoiding both SSR mismatch and a flash on repeat visits.
export default function IntroOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const timeExpiredRef = useRef(false);
  const dismissedRef = useRef(false);

  // Decide visibility after mount (client-only storage). The flag is only
  // WRITTEN when the veil actually renders — inside the rAF. Dev StrictMode
  // double-mounts: mount #1's rAF gets cancelled by the cleanup, so the
  // flag survives unwritten and mount #2 re-schedules and shows. Burning it
  // earlier made the overlay un-showable in dev.
  useEffect(() => {
    let show = false;
    try {
      show = !sessionStorage.getItem(SESSION_KEY);
    } catch {
      // Private-mode Safari can throw on storage access — show anyway.
      show = true;
    }
    if (!show) return;
    const raf = requestAnimationFrame(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // best effort — showing matters more than remembering
      }
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    document.body.classList.add("scroll-locked");

    const armTimer = window.setTimeout(() => {
      timeExpiredRef.current = true;
    }, 3000);

    let unmountTimer: number | undefined;

    const dismiss = () => {
      if (dismissedRef.current || !timeExpiredRef.current) return;
      dismissedRef.current = true;
      setIsFading(true);
      document.body.classList.remove("scroll-locked");
      unmountTimer = window.setTimeout(() => setIsVisible(false), 500);
    };

    window.addEventListener("touchstart", dismiss, { passive: true });
    window.addEventListener("wheel", dismiss, { passive: true });

    return () => {
      window.clearTimeout(armTimer);
      if (unmountTimer !== undefined) window.clearTimeout(unmountTimer);
      window.removeEventListener("touchstart", dismiss);
      window.removeEventListener("wheel", dismiss);
      document.body.classList.remove("scroll-locked");
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`intro-overlay${isFading ? " hide" : ""}`} aria-hidden="true">
      <div className="intro-track">
        <span className="intro-hand">👆</span>
      </div>
      <p className="intro-text">gerakkan layar untuk menjelajahi toko</p>
    </div>
  );
}
