"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// The pill that slides behind the current tab or segment (TopNav, SegmentedNav).
// It is only the background: the links stay plain links. Put it first inside a
// `relative isolate` wrapper that also holds the links. It finds the link marked
// aria-current="page", measures it, and moves itself there with a transform.
//
// `watch` is anything that changes when the current link changes (the path, the active href).
// A tap slides it right away; first placement, window resizes, and late font loads move it with no animation.
// Until it has measured (and with JavaScript off) the wrapper has no data-ready attribute,
// so the current link keeps its own background and nothing looks broken.
export function SlidingPill({ watch, className }: { watch: string; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  // `link`: slide to this link instead of the current one (used the moment a link is tapped).
  function place(animate: boolean, link?: HTMLElement) {
    const pill = ref.current;
    const track = pill?.parentElement;
    if (!pill || !track) return;
    const current = link ?? track.querySelector<HTMLElement>('[aria-current="page"]');
    const target = current?.querySelector<HTMLElement>("[data-pill-target]") ?? current;
    // No current link, or the nav is hidden at this screen size: show no pill.
    if (!target || target.offsetWidth === 0) {
      pill.style.opacity = "0";
      track.removeAttribute("data-ready");
      placed.current = false;
      return;
    }
    if (!animate) pill.style.transition = "none";
    pill.style.width = `${target.offsetWidth}px`;
    pill.style.height = `${target.offsetHeight}px`;
    pill.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
    pill.style.opacity = "1";
    if (!animate) {
      void pill.offsetWidth; // apply the jump now, then give the transition back
      pill.style.transition = "";
    }
    track.setAttribute("data-ready", "");
    placed.current = true;
  }

  // Before paint, so the pill is never seen in the wrong place. Slides only after the first placement.
  useLayoutEffect(() => {
    place(placed.current);
  }, [watch]);

  // Link widths change when the window resizes or the web font arrives: measure again, no slide.
  useEffect(() => {
    const remeasure = () => place(false);
    window.addEventListener("resize", remeasure);
    document.fonts?.ready.then(remeasure).catch(() => {});
    return () => window.removeEventListener("resize", remeasure);
  }, []);

  // Slide the moment a link is tapped, before the server answers. The link itself still does
  // the navigating; when the new page arrives, the effect above confirms the position.
  useEffect(() => {
    const track = ref.current?.parentElement;
    if (!track) return;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new-tab clicks
      const link = (e.target as Element).closest<HTMLElement>("a");
      if (link && track.contains(link) && placed.current) place(true, link);
    };
    track.addEventListener("click", onClick);
    return () => track.removeEventListener("click", onClick);
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      className={`pill-slide pointer-events-none absolute top-0 left-0 -z-10 opacity-0 ${className}`}
    />
  );
}
