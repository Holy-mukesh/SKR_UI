import { useRef } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import Footer from './Footer';

/* Every page: content that scrolls over the backdrop, the shared heading reveals, and the footer */
export default function Page({ hero = false, footer = true, className = '', children }) {
  const ref = useRef(null);

  useGSAP(() => {
    if (reduceMotion) return;
    // Page headers animate themselves (after the curtain lifts); everything else reveals on scroll
    gsap.utils.toArray('.line-mask > span').forEach(line => {
      if (line.closest('.page-head, .venue--page')) return;
      gsap.from(line, {
        yPercent: 110, duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: line.parentElement, start: 'top 88%' }
      });
    });
    gsap.utils.toArray('.eyebrow').forEach(el => {
      if (el.closest('.page-head, .venue__title')) return;
      gsap.from(el, {
        opacity: 0, x: -20, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });
  }, { scope: ref });

  return (
    <main ref={ref} className={['page', hero && 'page--home', className].filter(Boolean).join(' ')}>
      {/* Spacer: lets the fixed landing stage fill the first screen */}
      {hero && <section className="hero" aria-label="Welcome" />}
      <div className="content">
        {children}
        {footer && <Footer />}
      </div>
    </main>
  );
}
