import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { useSite } from '../site';
import Page from '../components/Page';
import Lines from '../components/Lines';
import { Stars, StarInput } from '../components/Stars';
import { venues } from '../data/venues';
import { fetchReviews, postReview } from '../lib/reviews';

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
        <button className="rhero__write" onClick={onWrite}>
          <span>Write a review</span><i aria-hidden="true">→</i>
        </button>
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

/* ---------- One standout review, set large ---------- */

function Feature({ review }) {
  return (
    <section className="feature" aria-label="Featured review">
      <span className="feature__mark" aria-hidden="true">“</span>
      <blockquote className="feature__text">{review.text}</blockquote>
      <div className="feature__by">
        <Stars value={review.rating} />
        <span><b>{review.name}</b> · {venueName(review.place)}</span>
      </div>
    </section>
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

      </div>
    </Page>
  );
}
