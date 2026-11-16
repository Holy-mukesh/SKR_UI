import { useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { useSite } from '../site';
import Page from '../components/Page';
import Lines from '../components/Lines';
import { Stars } from '../components/Stars';
import BounceCards from '../components/BounceCards';
import { venues } from '../data/venues';
import './google-reviews.css';

// High-rated verified reviews from Google Maps
const GOOGLE_REVIEWS = [
  {
    id: 'g-arapalayam',
    venueId: 'arapalayam',
    venueName: 'Hotel SKR Sivabhagya',
    location: 'Aarapalayam, Madurai',
    rating: 5,
    author: 'Karthik Subramanian',
    date: '2 weeks ago',
    avatarBg: '#1a73e8', // Google Blue
    text: 'Exceptional hospitality in Madurai! The rooms are immaculate, well air-conditioned, and super convenient to Meenakshi Amman temple. Courteous staff and top-notch food.',
    url: 'https://www.google.com/maps/place/Hotel+SKR+Sivabhagya/@9.9356795,78.099898,17z/data=!4m24!1m12!3m11!1s0x3b00cfa749c44739:0xf03e7d4a55a4075!2sHotel+SKR+Sivabhagya!5m2!4m1!1i2!8m2!3d9.9356795!4d78.1024729!9m1!1b1!16s%2Fg%2F11y3ps63xb!3m10!1s0x3b00cfa749c44739:0xf03e7d4a55a4075!5m2!4m1!1i2!8m2!3d9.9356795!4d78.1024729!9m1!1b1!16s%2Fg%2F11y3ps63xb?entry=ttu'
  },
  {
    id: 'g-kodaikanal',
    venueId: 'kodaikanal',
    venueName: 'SKR SIVABHAGYA Resort',
    location: 'Vilpatti Hills, Kodaikanal',
    rating: 5,
    author: 'Ananya Deshmukh',
    date: 'a month ago',
    avatarBg: '#a142f4', // Google Purple
    text: 'A breathtaking mountain retreat atop Vilpatti hills! Watching the mist roll over the valley from the balcony was pure magic. Clean luxurious suites and warm food.',
    url: 'https://www.google.com/maps/place/SKR+SIVABHAGYA+Adventure+Resort/@10.275755,77.4966797,17z/data=!4m11!3m10!1s0x3b0767c6824f7c35:0x4972e034b1048c72!5m2!4m1!1i2!8m2!3d10.275755!4d77.4992546!9m1!1b1!16s%2Fg%2F11nvz6zj9b?entry=ttu'
  },
  {
    id: 'g-kochadai',
    venueId: 'kochadai',
    venueName: 'SKR Service Apartments',
    location: 'Kochadai, Madurai',
    rating: 5,
    author: 'Venkatesh Raman',
    date: '3 weeks ago',
    avatarBg: '#0d652d', // Google Green
    text: 'Perfect home-like stay for our whole family in Kochadai. The jacuzzi, open garden terrace, and 3 spacious bedrooms made our reunion memorable. Extremely clean!',
    url: 'https://www.google.com/maps/place/SKR+SIVABHAGYA/@9.9429466,78.067811,17z/data=!4m8!3m7!1s0x3b00cf0022d0d7ff:0x701be1b3a5a02a44!8m2!3d9.9429466!4d78.0703859!9m1!1b1!16s%2Fg%2F11w580wsq3?entry=ttu'
  }
];

/* ---------- Opening: heading beside the Google Maps BounceCards ---------- */

function Scoreboard({ onWrite }) {
  // When a bounce card is clicked, open that review's Google Maps page
  const handleCardClick = (index, item) => {
    const target = item || GOOGLE_REVIEWS[index];
    if (target?.url) {
      window.open(target.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <header className="page-head rhero">
      <div className="rhero__copy">
        <p className="eyebrow">Guest Reviews</p>
        <Lines as="h1" lines={['In their', <em>own words.</em>]} />
        <p className="page-head__intro">Every stay leaves a story. Read verified reviews from travelers on Google Maps — and share your own experience.</p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="rhero__write" onClick={onWrite}>
            <span>Write a review</span><i aria-hidden="true">→</i>
          </button>
        </div>
      </div>

      {/* Right side: BounceCards with Google Maps verified review cards in White Theme */}
      <div className="rhero__bounce" aria-label="Google Maps Reviews Stack">
        <BounceCards
          items={GOOGLE_REVIEWS}
          containerWidth={570}
          containerHeight={375}
          cardWidth={335}
          cardHeight={290}
          spread={108}
          rotation={6.5}
          arc={0}
          pushDistance={160}
          hoverScale={1.07}
          bounciness={0.62}
          animationDelay={0.45}
          animationStagger={0.09}
          borderWidth={1}
          borderColor="#dadce0"
          radius={16}
          shadow
          enableHover
          onCardClick={handleCardClick}
          renderCard={(r) => (
            <div className="gcard-bounce">
              <div className="gcard-bounce__top">
                <span className="gcard-bounce__badge">
                  <svg className="gcard-bounce__g-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>Google Reviews</span>
                </span>
                <div className="gcard-bounce__stars">
                  <Stars value={r.rating} />
                  <span className="gcard-bounce__rating-num">5.0</span>
                </div>
              </div>

              <div className="gcard-bounce__venue">
                <span className="gcard-bounce__venue-name">{r.venueName}</span>
                <span className="gcard-bounce__venue-loc">{r.location}</span>
              </div>

              <p className="gcard-bounce__text">“{r.text}”</p>

              <div className="gcard-bounce__bottom">
                <div className="gcard-bounce__author">
                  <div
                    className="gcard-bounce__avatar"
                    style={{ backgroundColor: r.avatarBg || '#1a73e8' }}
                  >
                    {r.author.charAt(0)}
                  </div>
                  <div>
                    <span className="gcard-bounce__author-name">{r.author}</span>
                    <span className="gcard-bounce__date">{r.date}</span>
                  </div>
                </div>
                <span className="gcard-bounce__link">
                  READ ↗
                </span>
              </div>
            </div>
          )}
        />
        <p className="rhero__bounce-hint">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          Google Maps Verified · Hover to expand · Click to read
        </p>
      </div>
    </header>
  );
}

/* ---------- "Share your stay" → Google Maps redirect ---------- */

function WriteOnGmaps() {
  const [selectedVenue, setSelectedVenue] = useState(venues[0].id);

  const reviewUrl = useMemo(() => {
    const v = venues.find(x => x.id === selectedVenue);
    return v?.googleReviewUrl || v?.directions || '#';
  }, [selectedVenue]);

  return (
    <section className="write write--gmaps" id="write" aria-label="Write a review on Google Maps">
      <div className="write__copy">
        <p className="eyebrow">Your turn</p>
        <h2 className="write__title">Share your <em>stay.</em></h2>
        <p className="write__note">
          Your review on Google Maps helps future guests discover us and choose the right property. Select a location below, then hit the button to write your review directly on Google.
        </p>
        <ul className="write__tips">
          <li>Takes about a minute</li>
          <li>Appears on Google Maps for all travelers</li>
          <li>Verified and trusted by millions</li>
        </ul>
      </div>

      <div className="gmaps-redirect-form">
        <div className="gmaps-redirect-form__inner">
          <label className="gmaps-redirect-form__label">
            <span className="gmaps-redirect-form__eyebrow">Select your property</span>
            <select
              className="gmaps-redirect-form__select"
              value={selectedVenue}
              onChange={e => setSelectedVenue(e.target.value)}
            >
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name} — {v.type}</option>
              ))}
            </select>
          </label>

          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gmaps-redirect-form__btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Write a Review on Google Maps</span>
            <i>↗</i>
          </a>

          <div className="gmaps-redirect-form__quick">
            {venues.map(v => (
              <a
                key={v.id}
                href={v.googleReviewUrl || v.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="gmaps-write-btn"
              >
                <span>★ {v.name} ↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default function Reviews() {
  const ref = useRef(null);
  const { scrollToTarget, transitioning } = useSite();

  const toForm = () => scrollToTarget(document.getElementById('write'), -40);

  // Opening animation, once the page-change curtain has lifted
  useGSAP(() => {
    if (reduceMotion) return;
    gsap.timeline({ delay: transitioning ? 1.05 : 0.3 })
      .from('.rhero .eyebrow', { opacity: 0, x: -20, duration: 1.2, ease: 'expo.out' })
      .from('.rhero .line-mask > span', { yPercent: 110, duration: 1.5, stagger: 0.12, ease: 'expo.out' }, 0.05)
      .from('.rhero .page-head__intro, .rhero__write', { opacity: 0, y: 24, duration: 1.2, stagger: 0.1, ease: 'expo.out' }, 0.35)
      .from('.rhero__bounce', { opacity: 0, y: 30, duration: 1.4, ease: 'expo.out' }, 0.3);

    gsap.from('.write > *', {
      opacity: 0, y: 40, duration: 1.3, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '.write', start: 'top 80%' }
    });
  }, { scope: ref });

  return (
    <Page className="page--reviews">
      <div className="rpage" ref={ref}>
        <Scoreboard onWrite={toForm} />

        {/* Share your stay → Google Maps redirect */}
        <WriteOnGmaps />
      </div>
    </Page>
  );
}
