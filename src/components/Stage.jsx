import { useRef } from 'react';
import { gsap, useGSAP, reduceMotion, finePointer } from '../motion';

const NAME = 'SIVABHAGYA';

/* One copy of the landing composition. The stage renders it twice: sharp, and a lightly blurred twin. */
function StageLayer({ blurred = false }) {
  const Title = blurred ? 'div' : 'h1';
  return (
    <div className={`stage__layer${blurred ? ' stage__layer--blur' : ''}`} aria-hidden={blurred || undefined}>
      <div className="hero__glow" aria-hidden="true" />

      <div className="hero__inner">
        <div className="hero__mark">
          <div className="hero__logo">
            <img
              src="/assets/logo-crest.webp"
              alt={blurred ? '' : 'SKR Sivabhagya crest — a gold crown above an S and B monogram'}
            />
            <span className="hero__shine" aria-hidden="true" />
          </div>
        </div>

        <div className="hero__copy">
          <Title className="hero__title">
            <span className="hero__pre">SKR</span>
            <span className="hero__name" aria-label={NAME}>
              {[...NAME].map((c, i) => <span className="char" aria-hidden="true" key={i}>{c}</span>)}
            </span>
          </Title>
          <p className="hero__tag">Kodaikanal <em>&middot;</em> Arapalayam <em>&middot;</em> Kochadai</p>
        </div>
      </div>
    </div>
  );
}

export default function Stage() {
  const ref = useRef(null);

  useGSAP(() => {
    if (reduceMotion) return;
    const [sharp, soft] = gsap.utils.toArray('.stage__layer', ref.current);
    const inner = sharp.querySelector('.hero__inner');
    const mark = sharp.querySelector('.hero__mark');

    /* Where the crest has to travel to sit centred, and how far it can grow (layout values ignore transforms) */
    const centreShift = () => innerHeight / 2 - (inner.offsetTop + mark.offsetTop + mark.offsetHeight / 2);
    const fillScale = () => Math.min((innerHeight * 0.74) / mark.offsetHeight, (innerWidth * 0.86) / mark.offsetWidth);

    gsap.timeline({
      scrollTrigger: {
        start: 0,
        end: () => innerHeight, // the first screen of scrolling
        scrub: true,
        invalidateOnRefresh: true
      }
    })
      // 1. the wordmark clears out first, so the crest never slides over live text
      .to('.hero__copy', { autoAlpha: 0, y: 48, filter: 'blur(10px)', ease: 'power2.out', duration: 0.3 }, 0)
      .to('.hero__foot', { autoAlpha: 0, ease: 'none', duration: 0.15 }, 0)
      // 2. then the crest drifts to centre and grows to fill the screen
      .to('.hero__mark', { y: centreShift, scale: fillScale, ease: 'power2.inOut', duration: 0.85 }, 0.15)
      .to('.hero__glow', { scale: 1.35, ease: 'none', duration: 1 }, 0)
      // 3. and the light blur settles over it
      .to(sharp, { opacity: 0, ease: 'power1.inOut', duration: 0.7 }, 0.3)
      .to(soft, { opacity: 1, ease: 'power1.inOut', duration: 0.7 }, 0.3);

    /* Glow follows the pointer gently while the landing is in view */
    if (finePointer) {
      const gx = gsap.quickTo('.hero__glow', 'x', { duration: 2, ease: 'power3.out' });
      const gy = gsap.quickTo('.hero__glow', 'y', { duration: 2, ease: 'power3.out' });
      const onMove = e => {
        if (scrollY > innerHeight) return;
        gx((e.clientX / innerWidth - 0.5) * 80);
        gy((e.clientY / innerHeight - 0.5) * 60);
      };
      addEventListener('mousemove', onMove);
      return () => removeEventListener('mousemove', onMove);
    }
  }, { scope: ref });

  return (
    <div ref={ref}>
      <div className="stage" id="top">
        <StageLayer />
        <StageLayer blurred />
      </div>

      <div className="hero__foot">
        <span>Hotels &amp; Resorts</span>
        <span>Scroll to enter</span>
      </div>
    </div>
  );
}
