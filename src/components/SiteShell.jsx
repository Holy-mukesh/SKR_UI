'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, reduceMotion } from '@/motion';
import { SiteContext } from '@/site';
import { venues } from '@/data/venues';
import { labelFor } from '@/data/pages';

import Nav from './Nav';
import Lightbox from './Lightbox';
import WhatsApp from './WhatsApp';

const sweepIn = d => `polygon(${300 - d}% -100%, 300% -100%, 300% 300%, -100% 300%, -100% ${300 - d}%)`;
const sweepOut = d => `polygon(${300 - d}% -100%, -100% -100%, -100% ${300 - d}%)`;

export default function SiteShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const lenisRef = useRef(null);
  const curtainRef = useRef(null);
  const busy = useRef(false);

  const introPending = useRef(!reduceMotion && pathname === '/');
  const introPlayed = useRef(introPending.current);

  const [introDone, setIntroDone] = useState(!introPending.current);
  const [transitioning, setTransitioning] = useState(false);
  const [curtainLabel, setCurtainLabel] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState(venues[0].booking);
  const [stay, setStay] = useState({});
  const [lightbox, setLightbox] = useState(null);

  const isAdminRoute = pathname?.startsWith('/admin');

  /* Smooth scrolling */
  useEffect(() => {
    if (isAdminRoute) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (reduceMotion) return;

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    const tick = t => lenis.raf(t * 1000);
    const refresh = () => ScrollTrigger.refresh();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenisRef.current = lenis;
    if (process.env.NODE_ENV === 'development') window.lenis = lenis;
    window.addEventListener('load', refresh);

    return () => {
      window.removeEventListener('load', refresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isAdminRoute]);

  /* Hold page still during intro/transition/overlays */
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (!introDone || transitioning || menuOpen || lightbox) lenis.stop();
    else lenis.start();
  }, [introDone, transitioning, menuOpen, lightbox]);

  /* Scroll nudge on first visit to home */
  const nudged = useRef(false);
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!introDone || !introPlayed.current || nudged.current || !lenis) return;
    nudged.current = true;

    let cancelled = false;
    const cancel = () => { cancelled = true; };
    const opts = { passive: true, once: true };
    window.addEventListener('wheel', cancel, opts);
    window.addEventListener('touchstart', cancel, opts);
    window.addEventListener('keydown', cancel, opts);

    const timer = setTimeout(() => {
      if (cancelled || lenis.scroll > 0) return;
      const depth = Math.min(160, window.innerHeight * 0.18);
      lenis.scrollTo(depth, {
        duration: 0.9,
        easing: t => 1 - Math.pow(1 - t, 3),
        onComplete: () => {
          if (!cancelled) lenis.scrollTo(0, { duration: 1.1, easing: t => 1 - Math.pow(1 - t, 3) });
        }
      });
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }, [introDone]);

  const scrollToTarget = useCallback((target, offset = 0) => {
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(target, { duration: 1.6, offset });
    else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    else target.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const jumpTo = useCallback(target => {
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else if (target === 0) window.scrollTo(0, 0);
    else target.scrollIntoView();
  }, []);

  /* Navigate with curtain transition */
  const go = useCallback(to => {
    const url = new URL(to, window.location.href);
    setMenuOpen(false);

    if (url.pathname === window.location.pathname) {
      const target = url.hash && url.hash !== '#top' ? document.querySelector(url.hash) : 0;
      if (target !== null) scrollToTarget(target);
      return;
    }
    if (busy.current) return;

    const dest = url.pathname + url.hash;
    if (reduceMotion) {
      router.push(dest);
      return;
    }

    busy.current = true;
    setCurtainLabel(labelFor(url.pathname));
    setTransitioning(true);
    const curtain = curtainRef.current;
    gsap.timeline()
      .set(curtain, { autoAlpha: 1 })
      .fromTo(curtain, { clipPath: sweepIn(0) }, { clipPath: sweepIn(200), duration: 1, ease: 'expo.inOut' })
      .fromTo(curtain.firstChild, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, '-=0.35')
      .add(() => router.push(dest), '+=0.05');
  }, [router, scrollToTarget]);

  /* After route change: lift curtain */
  const firstRoute = useRef(true);
  useLayoutEffect(() => {
    const target = () => (window.location.hash && document.querySelector(window.location.hash)) || 0;

    if (firstRoute.current) {
      firstRoute.current = false;
      window.scrollTo(0, 0);
      if (window.location.hash) requestAnimationFrame(() => jumpTo(target()));
      return;
    }

    jumpTo(0);
    ScrollTrigger.refresh();
    jumpTo(target());
    if (!busy.current) return;

    const curtain = curtainRef.current;
    gsap.timeline({
      delay: 0.15,
      onComplete: () => {
        busy.current = false;
        setTransitioning(false);
        gsap.set(curtain, { autoAlpha: 0 });
        ScrollTrigger.refresh();
      }
    })
      .to(curtain.firstChild, { opacity: 0, y: -24, duration: 0.45, ease: 'power2.in' })
      .fromTo(curtain, { clipPath: sweepOut(0) }, { clipPath: sweepOut(200), duration: 1.1, ease: 'expo.inOut' }, 0.2);
  }, [pathname, jumpTo]);

  const site = useMemo(() => ({
    go,
    scrollToTarget,
    location,
    setLocation,
    stay,
    setStay,
    transitioning,
    introPending,
    finishIntro: () => {
      introPending.current = false;
      setIntroDone(true);
    },
    openLightbox: (venueId, index) => setLightbox({ venueId, index })
  }), [go, scrollToTarget, location, stay, transitioning]);

  const lightboxVenue = lightbox && venues.find(v => v.id === lightbox.venueId);

  if (isAdminRoute) {
    return (
      <SiteContext.Provider value={site}>
        {children}
      </SiteContext.Provider>
    );
  }

  return (
    <SiteContext.Provider value={site}>
      <div className="grain" aria-hidden="true" />
      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {children}

      <WhatsApp />

      <Lightbox
        venue={lightboxVenue}
        index={lightbox?.index ?? 0}
        onIndex={index => setLightbox(lb => ({ ...lb, index }))}
        onClose={() => setLightbox(null)}
      />

      <div className="curtain" ref={curtainRef} aria-hidden="true">
        <div className="curtain__inner">
          <img src="/assets/logo-crest-sm.webp" alt="" />
          <span>{curtainLabel}</span>
        </div>
      </div>
    </SiteContext.Provider>
  );
}
