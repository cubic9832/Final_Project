import { useLayoutEffect, useRef } from 'react';

export default function useScrollReveal() {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!container || !('IntersectionObserver' in window)) return;
    const elements = container.querySelectorAll('[data-reveal]');
    const updateHeight = () => {
      container.style.setProperty('--preview-top', `${container.getBoundingClientRect().top}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    const header = document.querySelector('header');
    const headerObserver = new ResizeObserver(updateHeight);
    if (header) headerObserver.observe(header);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const visibleRatio = Math.min(0.3, (entry.rootBounds?.height ?? window.innerHeight) / entry.boundingClientRect.height * 0.3);
        entry.target.classList.toggle('is-visible', entry.isIntersecting && entry.intersectionRatio >= visibleRatio);
      });
    }, { threshold: [0, 0.08, 0.15, 0.3, 0.5, 1] });

    const updatePreference = () => {
      observer.disconnect();
      elements.forEach(element => {
        element.classList.toggle('is-reveal-ready', !preference.matches);
        element.classList.remove('is-visible');
        if (!preference.matches) observer.observe(element);
      });
    };
    elements.forEach(element => element.classList.toggle('is-reveal-ready', !preference.matches));
    let observeFrame;
    const paintFrame = requestAnimationFrame(() => {
      observeFrame = requestAnimationFrame(() => {
        if (!preference.matches) elements.forEach(element => observer.observe(element));
      });
    });
    preference.addEventListener('change', updatePreference);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
      headerObserver.disconnect();
      cancelAnimationFrame(paintFrame);
      if (observeFrame) cancelAnimationFrame(observeFrame);
      preference.removeEventListener('change', updatePreference);
      elements.forEach(element => element.classList.remove('is-reveal-ready', 'is-visible'));
    };
  }, []);

  return containerRef;
}
