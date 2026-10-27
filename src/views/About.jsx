import { useRef } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import Page from '../components/Page';
import PageHeader from '../components/PageHeader';
import Motif from '../components/Motif';
import Locations from '../components/Locations';
import Lines from '../components/Lines';

const PHOTO = '/assets/about-reception.webp';
const PHOTO_SM = '/assets/about-reception-sm.webp';

function Photo() {
  return (
    <picture>
      <source media="(max-width: 700px)" srcSet={PHOTO_SM} />
      <img src={PHOTO} alt="" />
    </picture>
  );
}

/* The reception wall, fixed behind the whole page; it softens into a blur once you scroll past the first screen */
function Backdrop() {
  const ref = useRef(null);

  useGSAP(() => {
    if (reduceMotion) return;
    gsap.timeline({
      scrollTrigger: { start: 0, end: () => innerHeight, scrub: true, invalidateOnRefresh: true }
    })
      .to('.backdrop__layer--blur', { opacity: 1, ease: 'power1.inOut' }, 0)
      .to('.backdrop__shade', { opacity: 1, ease: 'power1.inOut' }, 0);
  }, { scope: ref });

  return (
    <div className="backdrop" ref={ref} aria-hidden="true">
      <div className="backdrop__layer"><Photo /></div>
      <div className="backdrop__layer backdrop__layer--blur"><Photo /></div>
      <div className="backdrop__shade" />
      <div className="backdrop__grad" />
    </div>
  );
}

/* The group's history, in the client's own words: two chapters on a gold line, then the motto */
const CHAPTERS = [
  {
    year: '1995',
    place: 'Aarapalayam · Madurai',
    text: <>Founded in Aarapalayam in 1995, Sivabhagya has grown into a respected group with a legacy of excellence across its hotels, marriage halls and hospitality ventures.</>,
    by: 'Mr. Sivaji',
    role: 'Founder, Sivabhagya'
  },
  {
    year: '2021',
    place: 'Kodaikanal',
    text: <>Carrying this tradition forward, SKR Sivabhagya Adventure Resort opened in Kodaikanal in 2021, bringing together luxury, nature and adventure to create exceptional guest experiences.</>,
    by: 'Mr. Karthikeyan',
    role: 'Founder & Managing Director, SKR Sivabhagya'
  }
];

function Legacy() {
  const ref = useRef(null);

  useGSAP(() => {
    if (reduceMotion) return;
    gsap.from('.legacy__lead, .legacy__entry, .legacy__motto', {
      opacity: 0, y: 30, duration: 1.3, stagger: 0.14, ease: 'expo.out',
      scrollTrigger: { trigger: ref.current, start: 'top 75%' }
    });
  }, { scope: ref });

  return (
    <section className="legacy" ref={ref}>
      <div className="legacy__head">
        <p className="eyebrow">Our Legacy</p>
        <Lines lines={['A legacy of', <em>excellence.</em>]} />
      </div>

      <div className="legacy__body">
        <p className="legacy__lead">
          Established in 1995, SKR Sivabhagya represents a distinguished legacy of hospitality, seamlessly blending
          timeless tradition with modern comfort. With a presence in Madurai and Kodaikanal, we offer thoughtfully
          curated stays defined by elegance, convenience, and exceptional value. Rooted in a commitment to gracious
          service and guest satisfaction, SKR Sivabhagya continues to create memorable experiences where comfort meets
          refined hospitality.
        </p>
        {CHAPTERS.map(c => (
          <article className="legacy__entry" key={c.year}>
            <p className="legacy__meta">
              <span className="legacy__year">{c.year}</span>
              <span className="legacy__place">{c.place}</span>
            </p>
            <p className="legacy__text">{c.text}</p>
            <p className="legacy__by">{c.by} <span>· {c.role}</span></p>
          </article>
        ))}

        <p className="legacy__motto">
          Sivabhagya — <em>A Legacy of Excellence.</em> An Experience Beyond Ordinary.
        </p>
      </div>
    </section>
  );
}

export default function About() {
  return (
    <>
      <Backdrop />
      <Page className="page--about">
        <PageHeader
          hero
          eyebrow="About Us"
          lines={[<>The House of <em>Sivabhagya.</em></>]}
          intro="Three addresses, one way of welcoming you — warm, attentive and unhurried."
        />
        <Legacy />
        <Motif />
        <Locations />
      </Page>
    </>
  );
}
