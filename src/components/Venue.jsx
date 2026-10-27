import { useRef } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { useSite } from '../site';
import { venues, rupees } from '../data/venues';
import dynamic from 'next/dynamic';
import Availability from './Availability';
import SiteLink from './SiteLink';
import Gallery from './Gallery';

const PlaceMap = dynamic(() => import('./PlaceMap'), { ssr: false });

/* A place's own page: intro, details beside the map, rooms & rates as cards, then the drifting gallery */
export default function Venue({ venue }) {
  const ref = useRef(null);
  const { transitioning } = useSite();

  useGSAP(() => {
    if (reduceMotion) return;

    // Intro plays once the page-change curtain has lifted
    gsap.timeline({ delay: transitioning ? 1.05 : 0.3 })
      .from('.venue__crumbs', { opacity: 0, duration: 1 })
      .from('.venue__num', { opacity: 0, x: -40, duration: 1.6, ease: 'expo.out' }, 0)
      .from('.venue__title .eyebrow', { opacity: 0, x: -20, duration: 1.2, ease: 'expo.out' }, 0.05)
      .from('.venue__name, .venue__type', { opacity: 0, y: 50, duration: 1.4, stagger: 0.1, ease: 'expo.out' }, 0.1)
      .from('.venue__desc, .venue__notice, .venue__stats > div, .venue__actions', { opacity: 0, y: 24, duration: 1.2, stagger: 0.07, ease: 'expo.out' }, 0.25);

    // The rest reveals as you scroll to it
    gsap.from('.venue__facts > div, .floors li, .venue__map', {
      opacity: 0, y: 24, duration: 1.1, stagger: 0.06, ease: 'expo.out',
      scrollTrigger: { trigger: '.venue__details', start: 'top 80%' }
    });
    gsap.fromTo('.map', { clipPath: 'inset(0% 0% 100% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut',
      scrollTrigger: { trigger: '.map', start: 'top 85%' }
    });
    gsap.from('.rates__head > *, .rate', {
      opacity: 0, y: 30, duration: 1.2, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: '.rates', start: 'top 82%' }
    });
    gsap.from('.rate__dots', {
      scaleX: 0, transformOrigin: 'left center', duration: 1.4, stagger: 0.1, ease: 'expo.inOut',
      scrollTrigger: { trigger: '.rates', start: 'top 78%' }
    });
  }, { scope: ref });

  return (
    <section className="venue venue--page" id={venue.id} ref={ref}>
      <div className="venue__crumbs">
        <SiteLink to="/places" className="link-quiet venue__back">All places</SiteLink>
        <span>{venue.num} &nbsp;/&nbsp; {venues[venues.length - 1].num}</span>
      </div>

      {/* 1 — Intro */}
      <div className="venue__intro">
        <div className="venue__title">
          <span className="venue__num" aria-hidden="true">{venue.num}</span>
          <p className="eyebrow">{venue.area}</p>
          <h1 className="venue__name">{venue.name}</h1>
          <p className="venue__type">{venue.type}</p>
        </div>

        <div className="venue__info">
          <p className="venue__desc">{venue.desc}</p>
          <Availability venue={venue} />
          <dl className="venue__stats">
            {venue.stats.map(([value, label]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <div className="venue__actions">
            <SiteLink to="#reserve" location={venue.booking} className="link-gold">Reserve here</SiteLink>
            <a href={venue.directions} target="_blank" rel="noopener" className="link-quiet">Directions</a>
          </div>
        </div>
      </div>

      {/* 2 — Details beside the map */}
      <div className="venue__details">
        <div className="venue__lists">
          <p className="eyebrow">At a glance</p>
          <dl className="venue__facts">
            {venue.facts.map(([term, detail]) => (
              <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>
            ))}
          </dl>

          {venue.floors && (
            <>
              <p className="eyebrow venue__sub">Floor by floor</p>
              <ol className="floors" style={{ '--n': venue.floors.length }}>
                {venue.floors.map(([floor, detail]) => (
                  <li key={floor}><span>{floor}</span><span>{detail}</span></li>
                ))}
              </ol>
            </>
          )}
        </div>

        <div className="venue__map">
          <p className="eyebrow">Find us</p>
          <PlaceMap venue={venue} />
          <p className="venue__pin">{venue.pin.label}</p>
        </div>
      </div>

      {/* 3 — Rooms & rates: a tariff card */}
      <div className="rates">
        <div className="rates__head">
          <p className="eyebrow">Rooms &amp; Rates</p>
          <h2 className="rates__title">The <em>tariff.</em></h2>
          <p className="rates__note">
            Current rates at {venue.name}. Send a request below and our desk will call you to confirm availability.
          </p>
          <SiteLink to="#reserve" location={venue.booking} className="link-gold">Reserve a room</SiteLink>
        </div>

        <ol className="tariff">
          {venue.rooms.map((room, i) => (
            <li className="rate" key={room.name}>
              <span className="rate__num">{String(i + 1).padStart(2, '0')}</span>
              <div className="rate__body">
                <div className="rate__line">
                  <span className="rate__name">{room.name}</span>
                  <i className="rate__dots" aria-hidden="true" />
                  <span className="rate__price">{rupees(room.price)}</span>
                </div>
                <div className="rate__sub">
                  <span className="rate__note">{room.note}</span>
                  <span className="rate__unit">{room.unit}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* 4 — Gallery */}
      <Gallery venue={venue} />
    </section>
  );
}
