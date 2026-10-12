import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, reduceMotion } from './motion';
import { SiteContext } from './site';
import { venues } from './data/venues';
import { labelFor } from './data/pages';

import Nav from './components/Nav';
import Lightbox from './components/Lightbox';
import WhatsApp from './components/WhatsApp';
import Home from './pages/Home';
import About from './pages/About';
import Places from './pages/Places';
import Place from './pages/Place';
import Reviews from './pages/Reviews';

// Loaded only when someone opens /admin, so visitors never download it
const Admin = lazy(() => import('./admin/Admin'));

/*
  Diagonal curtain: its edge runs corner-to-corner and travels from the bottom-right
  to the top-left. d is how far the edge has travelled (0 → 200, in % of the screen).
  Both shapes keep a fixed number of points so GSAP can tween between them.
*/
// covers the part of the screen where x + y ≥ 200 − d (grows out of the bottom-right corner)
const sweepIn = d => `polygon(${300 - d}% -100%, 300% -100%, 300% 300%, -100% 300%, -100% ${300 - d}%)`;
// covers where x + y ≤ 200 − d (shrinks away into the top-left corner)
const sweepOut = d => `polygon(${300 - d}% -100%, -100% -100%, -100% ${300 - d}%)`;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
        <Route path="*" element={<Site />} />
      </Routes>
    </BrowserRouter>
  );
}

function Site() {
  const navigate = useNavigate();
  const route = useLocation();

  const lenisRef = useRef(null);
  const curtainRef = useRef(null);
  const busy = useRef(false);
  // The opening intro plays once, and only when the visit starts on the home page
  const introPending = useRef(!reduceMotion && route.pathname === '/');
  const introPlayed = useRef(introPending.current); // stays true after the intro, unlike introPending

  const [introDone, setIntroDone] = useState(!introPending.current);
  const [transitioning, setTransitioning] = useState(false);
  const [curtainLabel, setCurtainLabel] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState(venues[0].booking);
  const [stay, setStay] = useState({}); // room and dates chosen in the booking form, for the WhatsApp message
  const [lightbox, setLightbox] = useState(null); // { venueId, index }

  /* Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync */
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (reduceMotion) return;

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    const tick = t => lenis.raf(t * 1000);
    const refresh = () => ScrollTrigger.refresh();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenisRef.current = lenis;
    if (import.meta.env.DEV) window.lenis = lenis; // handy for debugging in the console
    addEventListener('load', refresh);

    return () => {
      removeEventListener('load', refresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  /* Hold the page still during the intro, page changes and while an overlay is open */
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (!introDone || transitioning || menuOpen || lightbox) lenis.stop();
    else lenis.start();
  }, [introDone, transitioning, menuOpen, lightbox]);

  /* Once the intro has played, a small scroll down and back up hints that the page scrolls. Once per visit. */
  const nudged = useRef(false);
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!introDone || !introPlayed.current || nudged.current || !lenis) return;
    nudged.current = true;

    let cancelled = false;
    const cancel = () => { cancelled = true; };
    const opts = { passive: true, once: true };
    addEventListener('wheel', cancel, opts);
    addEventListener('touchstart', cancel, opts);
    addEventListener('keydown', cancel, opts);

    const timer = setTimeout(() => {
      if (cancelled || lenis.scroll > 0) return; // the visitor is already scrolling
      const depth = Math.min(160, innerHeight * 0.18);
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
      removeEventListener('wheel', cancel);
      removeEventListener('touchstart', cancel);
      removeEventListener('keydown', cancel);
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

  /* Navigate anywhere: same page = glide, other page = curtain transition */
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
      navigate(dest);
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
      .add(() => navigate(dest), '+=0.05');
  }, [navigate, scrollToTarget]);

  /* After every route change: reset scroll (or land on the #hash), then lift the curtain */
  const firstRoute = useRef(true);
  useLayoutEffect(() => {
    const target = () => (route.hash && document.querySelector(route.hash)) || 0;

    if (firstRoute.current) {
      firstRoute.current = false;
      window.scrollTo(0, 0);
      if (route.hash) requestAnimationFrame(() => jumpTo(target()));
      return;
    }

    jumpTo(0);
    ScrollTrigger.refresh();
    jumpTo(target());
    if (!busy.current) return; // browser back/forward: no curtain to lift

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
  }, [route.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const site = useMemo(() => ({
    go,
    scrollToTarget,
    location,
    setLocation,
    stay,
    setStay,
    transitioning,
    openLightbox: (venueId, index) => setLightbox({ venueId, index })
  }), [go, scrollToTarget, location, stay, transitioning]);

  const finishIntro = useCallback(() => {
    introPending.current = false;
    setIntroDone(true);
  }, []);

  const lightboxVenue = lightbox && venues.find(v => v.id === lightbox.venueId);

  return (
    <SiteContext.Provider value={site}>
      <div className="grain" aria-hidden="true" />
      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <Routes>
        <Route path="/" element={<Home introPending={introPending} onIntroDone={finishIntro} />} />
        <Route path="/about" element={<About />} />
        <Route path="/places" element={<Places />} />
        <Route path="/places/:id" element={<Place />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <WhatsApp />

      <Lightbox
        venue={lightboxVenue}
        index={lightbox?.index ?? 0}
        onIndex={index => setLightbox(lb => ({ ...lb, index }))}
        onClose={() => setLightbox(null)}
      />

      {/* Page-change curtain */}
      <div className="curtain" ref={curtainRef} aria-hidden="true">
        <div className="curtain__inner">
          <img src="/assets/logo-crest-sm.webp" alt="" />
          <span>{curtainLabel}</span>
        </div>
      </div>
    </SiteContext.Provider>
  );
}
