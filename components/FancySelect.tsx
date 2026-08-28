"use client";

import { useEffect, useId, useRef, useState } from "react";

export type FancyOption = { value: string; label: string };

// Hand-rolled select — native <select> popups are painted by the OS and can
// never carry the shop's look, so this replaces them wherever a plain select
// used to sit (search bar scoper, category filter, store picker). Same
// no-dependency ethos as the rest of the shop.
//
// The popup is SOLID on purpose, matching the search suggest panel: menus
// people READ stay opaque; glass stays on chrome. The trigger is styled per
// context via triggerClassName.
//
// Keyboard: ArrowDown/Up move, Home/End jump, Enter/Space pick, Escape/Tab
// close. The trigger keeps focus throughout, so global Tab order never
// changes. Outside pointerdowns close, like SearchSuggest.
export default function FancySelect({
  value,
  options,
  onChange,
  ariaLabel,
  triggerClassName = "",
  align = "left",
  onOpenChange,
}: {
  value: string;
  options: FancyOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  /** full className for the trigger pill — sized/context-styled by the caller */
  triggerClassName?: string;
  /** popover edge relative to the trigger */
  align?: "left" | "right";
  /** fires on open/close — e.g. SearchSuggest closes its suggest panel */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  function openMenu() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
    onOpenChange?.(true);
  }

  function close() {
    setOpen(false);
    onOpenChange?.(false);
  }

  function pick(v: string) {
    onChange(v);
    close();
    triggerRef.current?.focus();
  }

  // Click-outside close (pointerdown, so a drag that ends outside never counts).
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the keyboard-highlighted option visible in long lists.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (!open) {
      // Buttons already toggle on Enter/Space natively; arrows open too.
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (options.length ? (a + 1) % options.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + options.length) % Math.max(1, options.length));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, options.length - 1));
    } else if ((e.key === "Enter" || e.key === " ") && options[active]) {
      e.preventDefault();
      pick(options[active].value);
    } else if (e.key === "Tab") {
      close();
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openMenu())}
        className={`flex cursor-pointer items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-bimbi-sky/60 ${triggerClassName}`}
      >
        <span className="truncate">{selected?.label ?? ariaLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={`animate-pop-in absolute z-50 mt-2 max-h-64 min-w-full w-max max-w-[16rem] overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value} id={`${listId}-opt-${i}`} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => pick(o.value)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-bimbi-sun text-bimbi-ink"
                      : active === i
                        ? "bg-bimbi-cream text-bimbi-ink"
                        : "text-bimbi-ink"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      className="shrink-0 text-bimbi-pink"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
