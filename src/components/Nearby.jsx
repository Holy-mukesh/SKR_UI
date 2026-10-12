import { useRef } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { venues } from '../data/venues';
import Lines from './Lines';

/* Home: what is worth the trip around our two towns, each over a photo of our place there */
const byId = id => venues.find(v => v.id === id);

const TOWNS = [
  {
    town: 'Kodaikanal',
    tag: 'Around the hills',
    photo: byId('kodaikanal').backdrop?.src ?? byId('kodaikanal').cover.wide,
    spots: [
      ['Kodai Lake', 'A star-shaped lake ringed by trees, best at first light'],
      ["Coaker's Walk", 'A cliff-edge path with the plains far below'],
      ['Pillar Rocks', 'Three granite columns rising out of the mist'],
      ['Bryant Park', 'Gardens and glasshouses beside the lake']
    ]
  },
  {
    town: 'Madurai',
    tag: 'Around the temple city',
    photo: byId('arapalayam').cover.wide,
    spots: [
      ['Meenakshi Amman Temple', 'Towering painted gopurams — 5 km from Aarapalayam'],
      ['Thirumalai Nayakkar Mahal', 'A 17th-century palace of great white arches'],
      ['Vandiyur Mariamman Teppakulam', 'The vast temple tank, lit up at festivals'],
      ['Gandhi Memorial Museum', 'A quiet palace of history and gardens']
    ]
  }
];

export default function Nearby() {
  const ref = useRef(null);

  useGSAP(() => {
    if (reduceMotion) return;
    gsap.utils.toArray('.town', ref.current).forEach(town => {
      gsap.timeline({ scrollTrigger: { trigger: town, start: 'top 78%' } })
        .from(town, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
        .from(town.querySelector('.town__photo img'), { scale: 1.3, duration: 2.2, ease: 'expo.out' }, 0.1)
        .from(town.querySelectorAll('.town__head > *, .town__spot'), { opacity: 0, y: 26, duration: 1, stagger: 0.07, ease: 'expo.out' }, 0.7);
    });
  }, { scope: ref });

  return (
    <section className="nearby" ref={ref}>
      <div className="nearby__head">
        <p className="eyebrow">Nearby</p>
        <Lines lines={['Worth', <em>the journey.</em>]} />
      </div>

      <div className="nearby__towns">
        {TOWNS.map(t => (
          <article className="town" key={t.town}>
            <span className="town__photo" aria-hidden="true"><img src={t.photo} alt="" loading="lazy" /></span>
            <header className="town__head">
              <span className="town__tag">{t.tag}</span>
              <h3 className="town__name">{t.town}</h3>
            </header>
            <ol className="town__spots">
              {t.spots.map(([name, note], i) => (
                <li className="town__spot" key={name}>
                  <span className="town__idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="town__text">
                    <b>{name}</b>
                    <em>{note}</em>
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
