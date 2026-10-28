import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { useSite } from '../site';
import Page from '../components/Page';
import Lines from '../components/Lines';
import { Stars, StarInput } from '../components/Stars';
import { venues } from '../data/venues';
import { fetchReviews, postReview } from '../lib/reviews';
import './google-reviews.css';

// High-rated verified reviews from Google Maps
const GOOGLE_REVIEWS = [
  {
    id: 'g-arapalayam',
    venueId: 'arapalayam',
    venueName: 'Hotel SKR Sivabhagya · Aarapalayam, Madurai',
    rating: 5,
    author: 'Karthik Subramanian',
    date: '2 weeks ago',
    text: 'Exceptional hospitality in Madurai! The rooms are immaculate, well air-conditioned, and the location is super convenient to Meenakshi Amman temple and railway station. Staff was courteous and the food was top-notch.',
    url: 'https://www.google.com/maps/place/Hotel+SKR+Sivabhagya/@9.9356795,78.099898,17z/data=!4m24!1m12!3m11!1s0x3b00cfa749c44739:0xf03e7d4a55a4075!2sHotel+SKR+Sivabhagya!5m2!4m1!1i2!8m2!3d9.9356795!4d78.1024729!9m1!1b1!16s%2Fg%2F11y3ps63xb!3m10!1s0x3b00cfa749c44739:0xf03e7d4a55a4075!5m2!4m1!1i2!8m2!3d9.9356795!4d78.1024729!9m1!1b1!16s%2Fg%2F11y3ps63xb?entry=ttu'
  },
  {
    id: 'g-kodaikanal',
    venueId: 'kodaikanal',
    venueName: 'SKR SIVABHAGYA Adventure Resort · Kodaikanal',
    rating: 5,
    author: 'Ananya Deshmukh',
    date: 'a month ago',
    text: 'A breathtaking mountain retreat atop Vilpatti hills! Watching the mist roll over the valley from the balcony was pure magic. Clean luxurious suites, warm restaurant food, and wonderful peace of mind.',
    url: 'https://www.google.com/maps/place/SKR+SIVABHAGYA+Adventure+Resort/@10.275755,77.4966797,17z/data=!4m11!3m10!1s0x3b0767c6824f7c35:0x4972e034b1048c72!5m2!4m1!1i2!8m2!3d10.275755!4d77.4992546!9m1!1b1!16s%2Fg%2F11nvz6zj9b?entry=ttu'
  },
  {
    id: 'g-kochadai',
    venueId: 'kochadai',
    venueName: 'SKR SIVABHAGYA Service Apartments · Kochadai',
    rating: 5,
    author: 'Venkatesh Raman',
    date: '3 weeks ago',
    text: 'Perfect home-like stay for our whole family in Kochadai. The jacuzzi, open garden terrace, and 3 spacious bedrooms made our family reunion memorable. Extremely clean and well maintained with private car portico.',
    url: 'https://www.google.com/maps/place/SKR+SIVABHAGYA/@9.9429466,78.067811,17z/data=!4m8!3m7!1s0x3b00cf0022d0d7ff:0x701be1b3a5a02a44!8m2!3d9.9429466!4d78.0703859!9m1!1b1!16s%2Fg%2F11w580wsq3?entry=ttu'
  }
];

const MAX = 600;
const PAGE = 9; // cards shown before "Show more"
const venueName = id => venues.find(v => v.id === id)?.booking ?? '';
const when = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const average = list => (list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0);
const SORTS = {
  newest: { label: 'Newest', fn: (a, b) => b.date.localeCompare(a.date) },
  highest: { label: 'Highest rated', fn: (a, b) => b.rating - a.rating || b.date.localeCompare(a.date) },
  lowest: { label: 'Lowest rated', fn: (a, b) => a.rating - b.rating || b.date.localeCompare(a.date) }
};

/* ---------- Opening: heading beside the overall score ---------- */

const R = 54; // dial radius
const ARC = 2 * Math.PI * R;

function Scoreboard({ reviews, ready, onWrite }) {
  const count = reviews.length;
  const avg = average(reviews);

  return (
    <header className="page-head rhero">
      <div className="rhero__copy">
        <p className="eyebrow">Guest Reviews</p>
        <Lines as="h1" lines={['In their', <em>own words.</em>]} />
        <p className="page-head__intro">Every stay leaves a story. Read what our guests remember — and add your own.</p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="rhero__write" onClick={onWrite}>
            <span>Write a review</span><i aria-hidden="true">→</i>
          </button>
          <a
            href="#write-gmaps"
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              textDecoration: 'none',
              border: '1px solid var(--line)',
              padding: '12px 18px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(212, 166, 74, 0.06)'
            }}
          >
            <span>★ Review on Google Maps</span><i>↓</i>
          </a>
        </div>
      </div>

      <div className="rhero__score" aria-live="polite">
        <span className="rhero__label">Overall rating</span>
        <div className="rhero__body">
          {/* a gold dial that fills to the average */}
          <div className="dial">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="dial-gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f3d68a" />
                  <stop offset="0.5" stopColor="#c9962f" />
                  <stop offset="1" stopColor="#8a6420" />
                </linearGradient>
              </defs>
              <circle className="dial__track" cx="60" cy="60" r={R} />
              <circle
                className="dial__fill"
                cx="60" cy="60" r={R}
                strokeDasharray={ARC}
                strokeDashoffset={ARC * (1 - (ready && count ? avg / 5 : 0))}
              />
            </svg>
            <span className="dial__num">{ready && count ? avg.toFixed(1) : '–'}</span>
            <span className="dial__of">out of 5</span>
          </div>

          <div className="rhero__side">
            <Stars value={count ? Math.round(avg * 2) / 2 : 0} label={count ? `Average ${avg.toFixed(1)} out of 5` : 'No ratings yet'} />
            <span className="rhero__count">
              {!ready ? 'Loading reviews…' : count ? <><b>{count}</b> review{count > 1 ? 's' : ''}</> : 'No reviews yet'}
            </span>
            <ul className="dist" aria-label="Ratings breakdown">
              {[5, 4, 3, 2, 1].map(n => {
                const c = reviews.filter(r => r.rating === n).length;
                return (
                  <li key={n}>
                    <span className="dist__n">{n}<i aria-hidden="true">★</i></span>
                    <span className="dist__bar"><i style={{ transform: `scaleX(${count ? c / count : 0})` }} /></span>
                    <span className="dist__c">{c}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Instrument strip: each place's average ---------- */

function Gauges({ reviews }) {
  return (
    <section className="gauges" aria-label="Ratings by place">
      {venues.map(v => {
        const mine = reviews.filter(r => r.place === v.id);
        const avg = average(mine);
        return (
          <div className="gauge" key={v.id}>
            <span className="gauge__label">{v.num} · {v.name}</span>
            <span className="gauge__value">
              {mine.length ? avg.toFixed(1) : '–'}
              {mine.length > 0 && <small>/ 5</small>}
            </span>
            <span className="gauge__track" aria-hidden="true"><i style={{ transform: `scaleX(${avg / 5})` }} /></span>
            <span className="gauge__meta">{mine.length ? `${mine.length} review${mine.length > 1 ? 's' : ''}` : 'Awaiting first review'}</span>
          </div>
        );
      })}
    </section>
  );
}

/* ---------- Google Maps Reviews Showcase ---------- */

function GoogleReviewShowcase() {
  return (
    <section className="gmaps-showcase" aria-label="Google Maps Reviews">
      <div className="gmaps-showcase__header">
        <div>
          <p className="eyebrow">Verified Guest Feedback</p>
          <h2 className="gmaps-showcase__title">
            Rated by guests on <em>Google Maps</em>
          </h2>
        </div>
      </div>

      <div className="gmaps-grid">
        {GOOGLE_REVIEWS.map(item => (
          <article className="gmaps-card" key={item.id}>
            <div>
              <div className="gmaps-card__top">
                <span className="gmaps-card__badge">
                  <svg className="gmaps-card__g-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  Google Maps
                </span>
                <span className="gmaps-card__author">{item.date}</span>
              </div>

              <h3 className="gmaps-card__venue-name">{item.venueName.split('·')[0]}</h3>
              <div className="gmaps-card__rating" style={{ margin: '8px 0' }}>
                <Stars value={item.rating} />
                <span className="gmaps-card__score">5.0</span>
              </div>

              <p className="gmaps-card__quote">“{item.text}”</p>
              <div className="gmaps-card__author" style={{ marginTop: '8px' }}>
                <strong>{item.author}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gmaps-card__btn"
                title="Read full review on Google Maps"
              >
                <span>Read on Google Maps</span>
                <i>↗</i>
              </a>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gmaps-card__btn"
                style={{ borderColor: 'rgba(212, 166, 74, 0.45)', background: 'rgba(212, 166, 74, 0.12)' }}
                title="Write a review for this property on Google Maps"
              >
                <span>Write a Google Review</span>
                <i>✎</i>
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* Callout at the bottom of the page to write a review directly on Google Maps */
function GoogleReviewWriteCTA() {
  return (
    <div className="gmaps-write-cta" id="write-gmaps">
      <div className="gmaps-write-cta__info">
        <p className="eyebrow" style={{ color: 'var(--gold)', marginBottom: '4px' }}>Google Maps Reviews</p>
        <h3>Review SKR Sivabhagya on Google Maps</h3>
        <p>Choose your property below to write an official review directly on Google Maps:</p>
      </div>
      <div className="gmaps-write-cta__buttons">
        {venues.map(v => (
          <a
            key={v.id}
            href={v.googleReviewUrl || v.directions}
            target="_blank"
            rel="noopener noreferrer"
            className="gmaps-write-btn"
          >
            <span>★ Write Review · {v.name} ↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ---------- Review card ---------- */

function Card({ r }) {
  return (
    <li className="rcard" data-review={r.id}>
      <div className="rcard__top">
        <Stars value={r.rating} />
        <time dateTime={r.date}>{when(r.date)}</time>
      </div>
      <p className="rcard__text">{r.text}</p>
      <div className="rcard__by">
        <span className="rcard__mono" aria-hidden="true">{r.name.trim().charAt(0).toUpperCase()}</span>
        <span>
          <b>{r.name}</b>
          <small>{venueName(r.place)}</small>
        </span>
      </div>
    </li>
  );
}

/* ---------- Write a review ---------- */

function ReviewForm({ onAdd }) {
  const [name, setName] = useState('');
  const [place, setPlace] = useState(venues[0].id);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async e => {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = 'Please add your name.';
    if (!rating) next.rating = 'Please choose a rating.';
    if (text.trim().length < 10) next.text = 'A few more words, please (at least 10 characters).';
    setErrors(next);
    if (Object.keys(next).length || sending) {
      setStatus('');
      return;
    }

    setSending(true);
    setStatus('');
    try {
      const saved = await postReview({ name: name.trim(), place, rating, text: text.trim() });
      onAdd(saved);
      setName(''); setRating(0); setText('');
      setStatus('Thank you — your review is now live.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="rform" onSubmit={submit} noValidate>
      <div className="rform__row">
        <label className="field">
          <span>Your name</span>
          <input value={name} maxLength={60} onChange={e => setName(e.target.value)} aria-invalid={!!errors.name} autoComplete="name" />
          {errors.name && <em className="field__error">{errors.name}</em>}
        </label>
        <label className="field">
          <span>Stayed at</span>
          <select value={place} onChange={e => setPlace(e.target.value)}>
            {venues.map(v => <option key={v.id} value={v.id}>{v.booking}</option>)}
          </select>
        </label>
      </div>

      <div className="field">
        <span>Your rating</span>
        <StarInput value={rating} onChange={setRating} invalid={!!errors.rating} />
        {errors.rating && <em className="field__error">{errors.rating}</em>}
      </div>

      <label className="field">
        <span>Your review</span>
        <textarea
          rows={5}
          value={text}
          maxLength={MAX}
          onChange={e => setText(e.target.value)}
          aria-invalid={!!errors.text}
          placeholder="What made your stay memorable?"
        />
        {errors.text && <em className="field__error">{errors.text}</em>}
      </label>

      <div className="rform__foot">
        <span className="rform__count">{text.length} / {MAX}</span>
        <button type="submit" className="btn-gold" disabled={sending}>
          <span>{sending ? 'Posting…' : 'Post review'}</span>
        </button>
      </div>
      <p className="rform__status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}

/* ---------- Page ---------- */

export default function Reviews() {
  const ref = useRef(null);
  const { scrollToTarget, transitioning } = useSite();
  const [reviews, setReviews] = useState([]);
  const [load, setLoad] = useState('loading'); // loading | ready | error
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [limit, setLimit] = useState(PAGE);
  const [fresh, setFresh] = useState(null); // id of the review just added

  useEffect(() => {
    let live = true;
    fetchReviews()
      .then(list => { if (live) { setReviews(list); setLoad('ready'); } })
      .catch(() => live && setLoad('error'));
    return () => { live = false; };
  }, []);

  const shown = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter(r => r.place === filter)).slice().sort(SORTS[sort].fn),
    [reviews, filter, sort]
  );

  // The standout: the newest of the best-rated reviews with enough to say
  const featured = useMemo(() => {
    const best = reviews.filter(r => r.rating >= 4 && r.text.length >= 40);
    return (best.length ? best : reviews).slice().sort(SORTS.highest.fn)[0];
  }, [reviews]);

  const add = review => {
    setReviews(list => [review, ...list]);
    setFilter('all');
    setSort('newest');
    setFresh(review.id);
  };

  const toForm = () => scrollToTarget(document.getElementById('write'), -40);

  // Opening animation, once the page-change curtain has lifted
  useGSAP(() => {
    if (reduceMotion) return;
    gsap.timeline({ delay: transitioning ? 1.05 : 0.3 })
      .from('.rhero .eyebrow', { opacity: 0, x: -20, duration: 1.2, ease: 'expo.out' })
      .from('.rhero .line-mask > span', { yPercent: 110, duration: 1.5, stagger: 0.12, ease: 'expo.out' }, 0.05)
      .from('.rhero .page-head__intro, .rhero__write', { opacity: 0, y: 24, duration: 1.2, stagger: 0.1, ease: 'expo.out' }, 0.35)
      .from('.rhero__score > *', { opacity: 0, y: 30, duration: 1.4, stagger: 0.08, ease: 'expo.out' }, 0.2);

    gsap.from('.gauge', {
      opacity: 0, y: 30, duration: 1.2, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: '.gauges', start: 'top 88%' }
    });
    gsap.from('.write > *', {
      opacity: 0, y: 40, duration: 1.3, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '.write', start: 'top 80%' }
    });
  }, { scope: ref });

  // Feature quote and cards reveal once the reviews have loaded
  useGSAP(() => {
    if (reduceMotion || load !== 'ready') return;
    if (ref.current.querySelector('.feature')) {
      gsap.from('.feature > *', {
        opacity: 0, y: 40, duration: 1.4, stagger: 0.12, ease: 'expo.out',
        scrollTrigger: { trigger: '.feature', start: 'top 82%' }
      });
    }
    gsap.from('.rcard', {
      opacity: 0, y: 40, duration: 1.2, stagger: 0.06, ease: 'expo.out',
      scrollTrigger: { trigger: '.rgrid', start: 'top 88%' }
    });
  }, { scope: ref, dependencies: [load] });

  // A newly posted review: scroll to it and let it glide in
  useGSAP(() => {
    if (!fresh) return;
    const el = ref.current.querySelector(`[data-review="${fresh}"]`);
    if (!el) return;
    scrollToTarget(el, -140);
    if (reduceMotion) return;
    gsap.fromTo(el, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', delay: 0.4 });
  }, { scope: ref, dependencies: [fresh] });

  const tabs = [{ id: 'all', label: 'All', n: reviews.length }, ...venues.map(v => ({ id: v.id, label: v.name, n: reviews.filter(r => r.place === v.id).length }))];

  return (
    <Page className="page--reviews">
      <div className="rpage" ref={ref}>
        <Scoreboard reviews={reviews} ready={load !== 'loading'} onWrite={toForm} />

        {/* Google Maps Verified Reviews Showcase */}
        <GoogleReviewShowcase />

        <section className="write" id="write" aria-label="Write a review">
          <div className="write__copy">
            <p className="eyebrow">Your turn</p>
            <h2 className="write__title">Share your <em>stay.</em></h2>
            <p className="write__note">
              A few honest lines help the next guest choose — the room, the view, the people who looked after you.
            </p>
            <ul className="write__tips">
              <li>Takes about a minute</li>
              <li>Appears on this page straight away</li>
              <li>Just your first name is fine</li>
              <li><a href="#write-gmaps" style={{ color: 'var(--gold)' }}>Or review directly on Google Maps ↓</a></li>
            </ul>
          </div>
          <ReviewForm onAdd={add} />
        </section>
        <Gauges reviews={reviews} />

        {load === 'ready' && featured && <Feature review={featured} />}

        <section className="rwall" aria-label="All reviews">
          <div className="rbar">
            <div className="rtabs" role="tablist" aria-label="Filter reviews by place">
              {tabs.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={filter === t.id}
                  className={filter === t.id ? 'is-active' : undefined}
                  onClick={() => { setFilter(t.id); setLimit(PAGE); }}
                >
                  {t.label}<sup>{t.n}</sup>
                </button>
              ))}
            </div>
            <label className="rsort">
              <span>Sort</span>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {load === 'loading' ? (
            <p className="rlist__note" role="status">Loading reviews…</p>
          ) : load === 'error' ? (
            <p className="rlist__note" role="alert">Reviews could not be loaded right now. Please try again later.</p>
          ) : shown.length ? (
            <>
              <ol className="rgrid">
                {shown.slice(0, limit).map(r => <Card key={r.id} r={r} />)}
              </ol>
              {shown.length > limit && (
                <button className="gallery__more" onClick={() => setLimit(l => l + PAGE)}>
                  <span>Show more reviews ({shown.length - limit})</span>
                </button>
              )}
            </>
          ) : (
            <div className="rempty">
              <img src="/assets/logo-crest-sm.webp" alt="" />
              <p className="rempty__title">{reviews.length ? 'No reviews for this place yet.' : 'No reviews yet.'}</p>
              <p className="rempty__note">Your words could be the first a future guest reads.</p>
            </div>
          )}
        </section>

        {/* Google Maps write review redirect section */}
        <GoogleReviewWriteCTA />

      </div>
    </Page>
  );
}
