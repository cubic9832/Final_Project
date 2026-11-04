import { useEffect, useLayoutEffect, useState } from 'react';

const wheelThreshold = 24;
const wheelIdleMs = 90;
const transitionLockMs = 620;

export default function useSectionStage(containerRef) {
  const [activeSection, setActiveSection] = useState(0);
  const [stageEnabled, setStageEnabled] = useState(() => matchMedia('(min-width: 769px)').matches);

  useEffect(() => {
    const media = matchMedia('(min-width: 769px)');
    const update = () => setStageEnabled(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stageEnabled) return;
    // Commit the initial hidden sections before enabling transitions.
    let readyFrame;
    const paintFrame = requestAnimationFrame(() => {
      readyFrame = requestAnimationFrame(() => {
        container.dataset.stageReady = 'true';
      });
    });
    return () => {
      cancelAnimationFrame(paintFrame);
      if (readyFrame) cancelAnimationFrame(readyFrame);
      delete container.dataset.stageReady;
    };
  }, [containerRef, stageEnabled]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sections = [...container.querySelectorAll(':scope > section')];
    if (activeSection >= sections.length) {
      setActiveSection(Math.max(0, sections.length - 1));
      return;
    }
    sections.forEach((section, index) => {
      section.dataset.stagePosition = index < activeSection ? 'before' : index > activeSection ? 'after' : 'active';
      section.inert = stageEnabled && index !== activeSection;
      if (stageEnabled && index !== activeSection) section.setAttribute('aria-hidden', 'true');
      else section.removeAttribute('aria-hidden');
    });
    return () => sections.forEach(section => {
      section.inert = false;
      section.removeAttribute('aria-hidden');
      delete section.dataset.stagePosition;
    });
  }, [activeSection, stageEnabled, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stageEnabled) return;
    let lastEvent = 0;
    let lockedUntil = 0;
    let distance = 0;
    let awaitingIdle = false;
    const onWheel = event => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const section = event.target.closest('section');
      if (section && section.scrollHeight > section.clientHeight + 1) {
        const canScroll = event.deltaY > 0
          ? section.scrollTop + section.clientHeight < section.scrollHeight - 1
          : section.scrollTop > 0;
        if (canScroll) return;
      }
      event.preventDefault();
      const now = performance.now();
      const idle = now - lastEvent > wheelIdleMs;
      lastEvent = now;
      if (now < lockedUntil) return;
      if (awaitingIdle && !idle) return;
      if (idle) { distance = 0; awaitingIdle = false; }
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1);
      if (Math.sign(delta) !== Math.sign(distance)) distance = 0;
      distance += delta;
      if (Math.abs(distance) < wheelThreshold) return;
      const direction = Math.sign(distance);
      distance = 0;
      lockedUntil = now + transitionLockMs;
      awaitingIdle = true;
      setActiveSection(index => Math.max(0, Math.min(container.querySelectorAll(':scope > section').length - 1, index + direction)));
    };
    const onClick = event => {
      const anchor = event.target.closest('a[href^="#about-preview-"]');
      if (!anchor) return;
      const index = [...container.querySelectorAll(':scope > section')].findIndex(section => `#${section.id}` === anchor.getAttribute('href'));
      if (index < 0) return;
      event.preventDefault();
      setActiveSection(index);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);
    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
    };
  }, [containerRef, stageEnabled]);

  return { activeSection, stageEnabled, setActiveSection };
}
