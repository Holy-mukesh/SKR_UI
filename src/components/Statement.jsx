import { useRef } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';

/*
  Home: the opening line under the landing. Each word starts as a faint ghost and
  fills with light as you scroll through it; the gold words carry the places.
*/
const WORDS = [
  'From', 'the', 'mist', 'of', 'the', ['Kodaikanal Hills'], 'to', 'the', 'temple', 'lamps', 'of', ['Madurai'], '—',
  'three', 'addresses,', 'and', 'one', 'way', 'of', ['keeping guests.']
];

export default function Statement() {
  const ref = useRef(null);

  useGSAP(() => {
    if (reduceMotion) return;
    gsap.fromTo('.statement__w',
      { opacity: 0.12 },
      {
        opacity: 1, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: '.statement__text', start: 'top 78%', end: 'bottom 48%', scrub: 0.8 }
      });
    gsap.from('.statement__rule', {
      scaleX: 0, duration: 1.6, ease: 'expo.inOut',
      scrollTrigger: { trigger: ref.current, start: 'top 80%' }
    });
  }, { scope: ref });

  return (
    <section className="statement" ref={ref}>
      <p className="eyebrow statement__eyebrow">The House of Sivabhagya</p>
      <p className="statement__text">
        {WORDS.map((w, i) => {
          const gold = Array.isArray(w);
          return (
            <span key={i} className={`statement__w${gold ? ' statement__w--gold' : ''}`}>
              {gold ? w[0] : w}
            </span>
          );
        })}
      </p>
      <span className="statement__rule" aria-hidden="true"><i /></span>
    </section>
  );
}
