"use client";

import { useEffect } from "react";

export default function DashboardMotion() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-section]"));
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".header-links a"));
    let frame = 0;

    function update() {
      frame = 0;
      const limit = document.documentElement.scrollHeight - window.innerHeight;
      const progress = limit > 0 ? Math.min(1, Math.max(0, window.scrollY / limit)) : 0;
      document.documentElement.style.setProperty("--scroll-progress", String(progress));
      const active = progress >= 0.995
        ? sections.at(-1)
        : sections.findLast((section) => section.getBoundingClientRect().top <= 155);
      for (const link of links) {
        if (link.hash === `#${active?.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (!motion.matches) entry.target.animate(
          [{ opacity: 0.65, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 440, easing: "cubic-bezier(.2,.75,.2,1)" },
        );
      }
    }, { threshold: 0.12 });
    sections.forEach((section) => observer.observe(section));
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--scroll-progress");
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
