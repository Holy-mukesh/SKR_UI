import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { venues } from '../data/venues';
import { placePath } from '../data/pages';
import Lines from './Lines';
import SiteLink from './SiteLink';

/*
  Home page only (moves on by itself every 3.5 seconds): one place at a time as a card in the middle, with the
  neighbouring places as open panels on either side whose lines run out to the
  screen edges. The card's own photo fills the section behind, dimmed. Arrows, the side panels, the
  keyboard and a swipe all move it along; it wraps round at either end.
*/
export default function PlacesCarousel() {
  const ref = useRef(null);
  const swipe = useRef(null);
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState(null); // { index, dir } of the card sliding out
  const n = venues.length;
  const at = i => venues[(i + n) % n];
  const prev = at(active - 1);
  const next = at(active + 1);

  // dir 1 = next (the new card slides in from the right), -1 = previous (from the left)
  const show = (index, dir) => {
    if (leaving || index === active) return;
    if (!reduceMotion) setLeaving({ index: active, dir });
    setActive(index);
  };
  const move = step => show((active + step + n) % n, step);

  // Moves on by itself every few seconds; any change (auto or by hand) restarts the wait.
  // Holds while the pointer is over it, and while it is off screen or the tab is hidden.
  const AUTOPLAY = 3500;
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (paused || !inView || leaving) return;
    const t = setTimeout(() => { if (!document.hidden) move(1); }, AUTOPLAY);
    return () => clearTimeout(t);
  }, [active, paused, inView, leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  // Section entrance: the card rises in, the side panels draw in from the edges
  useGSAP(() => {
    if (reduceMotion) return;
    gsap.timeline({ scrollTrigger: { trigger: '.pcar__stage', start: 'top 80%' } })
      .from('.pcar__window', { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out' })
      .from('.pcar__side--prev', { x: -40, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.2)
      .from('.pcar__side--next', { x: 40, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.2);
  }, { scope: ref });

  // Each change: the old card slides out one way while the new one slides in behind it
  useGSAP(() => {
    if (!leaving) return;
    const { dir } = leaving;
    const ease = 'expo.inOut';
    gsap.fromTo('.pcar__card--out', { xPercent: 0 }, { xPercent: -dir * 105, duration: 1, ease });
    // the backdrop photo travels the same way as the card in front of it
    gsap.fromTo('.pcar__bg img.is-out', { xPercent: 0 }, { xPercent: -dir * 100, duration: 1, ease });
    gsap.fromTo('.pcar__bg img.is-on', { xPercent: dir * 100 }, { xPercent: 0, duration: 1, ease });
    gsap.fromTo('.pcar__card--in', { xPercent: dir * 105 }, { xPercent: 0, duration: 1, ease, onComplete: () => setLeaving(null) });
    gsap.fromTo('.pcar__card--in .pcar__media img', { scale: 1.15 }, { scale: 1, duration: 1.6, ease: 'expo.out' });
    gsap.fromTo('.pcar__side-name', { opacity: 0, x: dir * 30 }, { opacity: 1, x: 0, duration: 0.9, delay: 0.25, ease: 'expo.out' });
  }, { scope: ref, dependencies: [leaving], revertOnUpdate: false });

  const card = (v, role) => (
    <article className={`pcar__card pcar__card--${role}`} aria-hidden={role === 'out' || undefined} key={`${role}-${v.id}`}>
      <SiteLink
        to={placePath(v.id)}
        className={`pcar__media${v.cover.homeWhole ? ' pcar__media--whole' : ''}`}
        style={v.cover.homeWhole ? { '--photo': `url(${v.cover.home})` } : undefined}
        tabIndex={-1}
        aria-hidden="true"
      >
        <img src={v.cover.home ?? v.cover.wide} alt="" />
      </SiteLink>
      <div className="pcar__body">
        <span className="pcar__type">{v.num} · {v.type}</span>
        <h3 className="pcar__name">{v.name}</h3>
        <p className="pcar__desc">{v.desc}</p>
        <SiteLink to={placePath(v.id)} className="pcar__go" tabIndex={role === 'out' ? -1 : undefined}>Explore</SiteLink>
      </div>
    </article>
  );

  const onKey = e => {
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  };
  const onPointerDown = e => { swipe.current = e.clientX; };
  const onPointerUp = e => {
    if (swipe.current == null) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
  };

  return (
    <section className="locations pcar" id="locations" ref={ref}>
      {/* Every place's photo is stacked behind; only the current one shows (and the outgoing one while it slides away) */}
      <div className="pcar__bg" aria-hidden="true">
        {venues.map((p, i) => (
          <img
            key={p.id}
            src={p.cover.home ?? p.cover.wide}
            alt=""
            loading="lazy"
            className={i === active ? 'is-on' : leaving?.index === i ? 'is-out' : ''}
          />
        ))}
      </div>

      <div className="locations__head pcar__head">
        <p className="eyebrow">Our Addresses</p>
        <Lines lines={['Three addresses.', <em>One welcome.</em>]} />
      </div>

      <div
        className="pcar__stage"
        role="region"
        aria-roledescription="carousel"
        aria-label="Our places"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null; }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <button type="button" className="pcar__side pcar__side--prev" onClick={() => move(-1)} aria-label={`Previous: ${prev.name}`}>
          <span className="pcar__arrow" aria-hidden="true" />
          <span className="pcar__side-name">{prev.name}</span>
        </button>

        <div className="pcar__window" aria-live="polite">
          {card(venues[active], 'in')}
          {leaving && card(venues[leaving.index], 'out')}
        </div>

        <button type="button" className="pcar__side pcar__side--next" onClick={() => move(1)} aria-label={`Next: ${next.name}`}>
          <span className="pcar__side-name">{next.name}</span>
          <span className="pcar__arrow" aria-hidden="true" />
        </button>
      </div>

      <div className="pcar__dots">
        {venues.map((p, i) => (
          <button
            type="button"
            key={p.id}
            className={i === active ? 'is-on' : leaving?.index === i ? 'is-out' : ''}
            onClick={() => show(i, Math.sign(i - active))}
            aria-label={`Show ${p.name}`}
            aria-current={i === active}
          />
        ))}
      </div>
    </section>
  );
}
