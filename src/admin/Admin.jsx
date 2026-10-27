import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api } from '../lib/api';
import { venues, rupees } from '../data/venues';
import { addDays, findUnit, freeByNight, nightsBetween, unitKey } from '../lib/stay';
import { Stars } from '../components/Stars';
import RoomLayout from './RoomLayout';
import './admin.css';

/*
  Admin dashboard at /admin.
  Sign-in is checked by the server (ADMIN_USERNAME / ADMIN_PASSWORD in .env); the session lives in an
  HttpOnly cookie, so nothing secret is stored in the browser. Every change goes straight to the server,
  so it shows on the public site for everyone.
*/

const STATUS_LABEL = { new: 'New', confirmed: 'Confirmed', cancelled: 'Cancelled' };
const placeName = id => venues.find(v => v.id === id)?.booking ?? id;
const day = iso => new Date(iso.length === 10 ? `${iso}T00:00` : iso)
  .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const stamp = iso => new Date(iso)
  .toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const nights = b => Math.round((Date.parse(b.departure) - Date.parse(b.arrival)) / 864e5);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Admin() {
  const [user, setUser] = useState(undefined); // undefined: checking, null: signed out

  useEffect(() => {
    const title = document.title;
    document.title = 'Admin · SKR Sivabhagya';
    const robots = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.append(robots);
    api('/admin/session').then(s => setUser(s.username)).catch(() => setUser(null));
    return () => { document.title = title; robots.remove(); };
  }, []);

  if (user === undefined) return <div className="adm adm--center"><p className="adm-muted">Loading…</p></div>;
  if (!user) return <Login onSignedIn={setUser} />;
  return <Dashboard user={user} onSignedOut={() => setUser(null)} />;
}

/* ---------- Sign in ---------- */

function Login({ onSignedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const s = await api('/admin/login', { method: 'POST', body: { username, password } });
      onSignedIn(s.username);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm adm--center">
      <form className="adm-login" onSubmit={submit}>
        <img src="/assets/logo-crest-sm.webp" alt="" className="adm-login__crest" />
        <h1 className="adm-login__title">SKR <i>✦</i> Admin</h1>
        <label className="adm-field">
          <span>Username</span>
          <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <label className="adm-field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-btn adm-btn--gold" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a href="/" className="adm-login__back">← Back to the website</a>
      </form>
    </div>
  );
}

/* ---------- Dashboard shell ---------- */

function Dashboard({ user, onSignedOut }) {
  const [reviews, setReviews] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Any 401 means the session ended (expired, or the server restarted): back to the sign-in screen
  const guard = useCallback(err => {
    if (err.status === 401) onSignedOut();
    else setError(err.message);
  }, [onSignedOut]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, b, k] = await Promise.all([api('/admin/reviews'), api('/admin/bookings'), api('/admin/blocks')]);
      setReviews(r);
      setBookings(b);
      setBlocks(k);
    } catch (err) {
      guard(err);
    } finally {
      setLoading(false);
    }
  }, [guard]);

  useEffect(() => { refresh(); }, [refresh]);

  const signOut = async () => {
    await api('/admin/logout', { method: 'POST' }).catch(() => {});
    onSignedOut();
  };

  const deleteReview = async r => {
    if (!confirm(`Delete the review by ${r.name}? It will be removed from the website immediately.`)) return;
    try {
      await api(`/admin/reviews/${r.id}`, { method: 'DELETE' });
      setReviews(list => list.filter(x => x.id !== r.id));
    } catch (err) {
      if (err.status === 404) setReviews(list => list.filter(x => x.id !== r.id));
      else guard(err);
    }
  };

  const setStatus = async (b, status) => {
    try {
      const updated = await api(`/admin/bookings/${b.id}`, { method: 'PATCH', body: { status } });
      setBookings(list => list.map(x => (x.id === b.id ? updated : x)));
    } catch (err) {
      guard(err);
    }
  };

  const deleteBooking = async b => {
    if (!confirm(`Delete the booking request from ${b.name}? This cannot be undone.`)) return;
    try {
      await api(`/admin/bookings/${b.id}`, { method: 'DELETE' });
      setBookings(list => list.filter(x => x.id !== b.id));
    } catch (err) {
      if (err.status === 404) setBookings(list => list.filter(x => x.id !== b.id));
      else guard(err);
    }
  };

  const addBlock = async block => {
    const saved = await api('/admin/blocks', { method: 'POST', body: block }); // errors are shown by the form
    setBlocks(list => [saved, ...list]);
  };

  const deleteBlock = async k => {
    if (!confirm('Free these dates again? They become bookable on the website straight away.')) return;
    try {
      await api(`/admin/blocks/${k.id}`, { method: 'DELETE' });
      setBlocks(list => list.filter(x => x.id !== k.id));
    } catch (err) {
      if (err.status === 404) setBlocks(list => list.filter(x => x.id !== k.id));
      else guard(err);
    }
  };

  const bookRoom = async bookingData => {
    const saved = await api('/admin/bookings', { method: 'POST', body: bookingData });
    setBookings(list => [saved, ...list]);
    return saved;
  };

  const fresh = bookings?.filter(b => b.status === 'new').length ?? 0;
  const ready = reviews && bookings && blocks;

  return (
    <div className="adm">
      <header className="adm-top">
        <a href="/admin" className="adm-brand">
          <img src="/assets/logo-crest-sm.webp" alt="" />
          <span>SKR <i>✦</i> Admin</span>
        </a>
        <nav className="adm-tabs" aria-label="Dashboard sections">
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/bookings">Bookings{fresh > 0 && <b className="adm-badge">{fresh}</b>}</NavLink>
          <NavLink to="/admin/room-layout">Room Layout</NavLink>
          <NavLink to="/admin/availability">Availability</NavLink>
          <NavLink to="/admin/reviews">Reviews</NavLink>
        </nav>
        <div className="adm-top__end">
          <button className="adm-btn" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <a href="/" className="adm-btn" target="_blank" rel="noreferrer">View site</a>
          <button className="adm-btn" onClick={signOut} title={`Signed in as ${user}`}>Sign out</button>
        </div>
      </header>

      <main className="adm-main">
        {error && <p className="adm-error" role="alert">{error}</p>}
        {!ready ? (
          !error && <p className="adm-muted">Loading…</p>
        ) : (
          <Routes>
            <Route index element={<Overview reviews={reviews} bookings={bookings} />} />
            <Route path="bookings" element={<Bookings bookings={bookings} onStatus={setStatus} onDelete={deleteBooking} />} />
            <Route path="room-layout" element={<RoomLayout bookings={bookings} blocks={blocks} onBookRoom={bookRoom} />} />
            <Route path="availability" element={<Availability bookings={bookings} blocks={blocks} onAdd={addBlock} onDelete={deleteBlock} onError={guard} />} />
            <Route path="reviews" element={<Reviews reviews={reviews} onDelete={deleteReview} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

/* ---------- Overview ---------- */

function Overview({ reviews, bookings }) {
  const today = todayISO();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const upcoming = bookings
    .filter(b => b.status === 'confirmed' && b.departure >= today)
    .sort((a, b) => a.arrival.localeCompare(b.arrival));

  const stats = [
    ['New requests', bookings.filter(b => b.status === 'new').length, 'Waiting for a call back'],
    ['Confirmed stays ahead', upcoming.length, 'Arriving or staying now'],
    ['Reviews', reviews.length, 'Shown on the website'],
    ['Average rating', reviews.length ? avg.toFixed(1) : '—', reviews.length ? 'out of 5' : 'No reviews yet']
  ];

  return (
    <>
      <h1 className="adm-h1">Overview</h1>
      <div className="adm-stats">
        {stats.map(([label, value, note]) => (
          <div className="adm-stat" key={label}>
            <span className="adm-stat__label">{label}</span>
            <span className="adm-stat__value">{value}</span>
            <span className="adm-muted">{note}</span>
          </div>
        ))}
      </div>

      <div className="adm-cols">
        <section className="adm-panel">
          <div className="adm-panel__head">
            <h2>Latest booking requests</h2>
            <NavLink to="/admin/bookings" className="adm-link">All bookings →</NavLink>
          </div>
          {bookings.length ? (
            <ul className="adm-mini">
              {bookings.slice(0, 6).map(b => (
                <li key={b.id}>
                  <div>
                    <strong>{b.name}</strong> · <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a>
                    <div className="adm-muted">{b.location}{b.roomName ? ` · ${b.roomName}` : ''} · {day(b.arrival)} → {day(b.departure)} · {b.guests} guest{String(b.guests) === '1' ? '' : 's'}</div>
                  </div>
                  <span className={`adm-pill adm-pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
                </li>
              ))}
            </ul>
          ) : <p className="adm-muted">No booking requests yet.</p>}
        </section>

        <section className="adm-panel">
          <div className="adm-panel__head">
            <h2>Latest reviews</h2>
            <NavLink to="/admin/reviews" className="adm-link">All reviews →</NavLink>
          </div>
          {reviews.length ? (
            <ul className="adm-mini">
              {reviews.slice(0, 4).map(r => (
                <li key={r.id}>
                  <div>
                    <Stars value={r.rating} />
                    <p className="adm-quote">"{r.text}"</p>
                    <div className="adm-muted">{r.name} · {placeName(r.place)} · {day(r.date)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="adm-muted">No reviews yet.</p>}
        </section>
      </div>
    </>
  );
}

/* ---------- Bookings ---------- */

function Bookings({ bookings, onStatus, onDelete }) {
  const [status, setStatus] = useState('all');
  const [location, setLocation] = useState('all');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter(b =>
      (status === 'all' || b.status === status) &&
      (location === 'all' || b.location === location) &&
      (!q || `${b.name} ${b.phone} ${b.email}`.toLowerCase().includes(q))
    );
  }, [bookings, status, location, query]);

  const exportCsv = () => {
    const cols = ['Received', 'Name', 'Phone', 'Email', 'Location', 'Floor', 'Room', 'Rooms', 'Arrival', 'Departure', 'Nights', 'Guests', 'Estimate (₹)', 'Status', 'Note'];
    const cell = v => `\"${String(v ?? '').replace(/\"/g, '\"\"')}\"`;
    const rows = shown.map(b => [b.createdAt, b.name, b.phone, b.email, b.location, b.floorName, b.roomName, b.rooms, b.arrival, b.departure, nights(b), b.guests, b.estimate?.total, b.status, b.note]);
    const csv = '﻿' + [cols, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `skr-bookings-${todayISO()}.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Booking requests <span className="adm-muted">({bookings.length})</span></h1>
        <button className="adm-btn" onClick={exportCsv} disabled={!shown.length}>Download CSV</button>
      </div>

      <div className="adm-filters">
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={location} onChange={e => setLocation(e.target.value)} aria-label="Filter by location">
          <option value="all">All locations</option>
          {venues.map(v => <option key={v.id} value={v.booking}>{v.booking}</option>)}
        </select>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, phone or email" />
      </div>

      {shown.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Received</th><th>Guest</th><th>Location &amp; room</th><th>Stay</th><th>Guests</th><th>Estimate</th><th>Status</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(b => (
                <tr key={b.id} className={b.status === 'new' ? 'is-new' : undefined}>
                  <td className="adm-nowrap">{stamp(b.createdAt)}</td>
                  <td>
                    <strong>{b.name}</strong>
                    <div><a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a></div>
                    {b.email && <div><a href={`mailto:${b.email}`}>{b.email}</a></div>}
                    {b.note && <div className="adm-muted">{b.note}</div>}
                  </td>
                  <td>
                    {b.location}
                    {b.roomName && <div className="adm-muted">{b.roomName}{b.rooms > 1 ? ` × ${b.rooms}` : ''}{b.floorName ? ` · ${b.floorName}` : ''}</div>}
                  </td>
                  <td className="adm-nowrap">
                    {day(b.arrival)} → {day(b.departure)}
                    <div className="adm-muted">{nights(b)} night{nights(b) === 1 ? '' : 's'}</div>
                  </td>
                  <td>{b.guests}</td>
                  <td className="adm-nowrap">{b.estimate ? rupees(b.estimate.total) : '—'}</td>
                  <td>
                    <select
                      className={`adm-status adm-pill--${b.status}`}
                      value={b.status}
                      onChange={e => onStatus(b, e.target.value)}
                      aria-label={`Status of ${b.name}'s request`}
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td><button className="adm-btn adm-btn--danger" onClick={() => onDelete(b)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-empty">{bookings.length ? 'No bookings match these filters.' : 'No booking requests yet. They appear here as soon as a guest sends the reservation form.'}</p>
      )}
    </>
  );
}

/* ---------- Availability: mark dates booked (walk-ins, phone bookings, maintenance) ---------- */

const MONTH_DAYS = 42;

function Availability({ bookings, blocks, onAdd, onDelete }) {
  const [placeId, setPlaceId] = useState(venues[0].id);
  const venue = venues.find(v => v.id === placeId);
  const units = venue.inventory.flatMap(f => venue.rooms.filter(r => f.rooms[r.id]).map(r => ({ floor: f, room: r, count: f.rooms[r.id] })));
  const [unitId, setUnitId] = useState(unitKey(units[0].floor.id, units[0].room.id));
  const unit = units.find(u => unitKey(u.floor.id, u.room.id) === unitId) ?? units[0];

  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [rooms, setRooms] = useState(String(unit.count));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [monthStart, setMonthStart] = useState(() => todayISO().slice(0, 8) + '01');

  const choosePlace = id => {
    const v = venues.find(x => x.id === id);
    const f = v.inventory[0];
    const r = v.rooms.find(x => f.rooms[x.id]);
    setPlaceId(id);
    setUnitId(unitKey(f.id, r.id));
    setRooms(String(f.rooms[r.id]));
  };
  const chooseUnit = id => {
    setUnitId(id);
    const u = units.find(x => unitKey(x.floor.id, x.room.id) === id);
    setRooms(String(u.count));
  };

  // What takes rooms here: confirmed bookings and blocks (the same rule as the website)
  const taken = useMemo(() => [
    ...bookings.filter(b => b.place === placeId && b.status === 'confirmed' && b.room),
    ...blocks.filter(b => b.place === placeId)
  ], [bookings, blocks, placeId]);

  const gridFrom = addDays(monthStart, -((new Date(`${monthStart}T00:00`).getDay() + 6) % 7));
  const free = freeByNight(venue, taken, gridFrom, MONTH_DAYS)[unitKey(unit.floor.id, unit.room.id)];
  const month = new Date(`${monthStart}T00:00`);
  const shiftMonth = n => {
    const d = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setMonthStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const submit = async e => {
    e.preventDefault();
    setMsg('');
    if (!arrival || !departure) return setMsg('Choose the first night and the check-out day.');
    setBusy(true);
    try {
      await onAdd({ place: placeId, floor: unit.floor.id, room: unit.room.id, rooms: Number(rooms), arrival, departure, note });
      setArrival(''); setDeparture(''); setNote('');
      setMsg('Saved — these dates now show as booked on the website.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const list = blocks
    .filter(k => k.departure >= todayISO())
    .sort((a, b) => a.arrival.localeCompare(b.arrival));

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Availability</h1>
      </div>
      <p className="adm-muted adm-lead">
        The website's booking calendar counts rooms as taken when a booking is <b>Confirmed</b>, or when you mark dates below
        (phone or walk-in guests, maintenance). New requests don't take rooms until you confirm them.
      </p>

      <div className="adm-filters">
        <select value={placeId} onChange={e => choosePlace(e.target.value)} aria-label="Place">
          {venues.map(v => <option key={v.id} value={v.id}>{v.booking}</option>)}
        </select>
        <select value={unitId} onChange={e => chooseUnit(e.target.value)} aria-label="Floor and room">
          {units.map(u => (
            <option key={unitKey(u.floor.id, u.room.id)} value={unitKey(u.floor.id, u.room.id)}>
              {u.floor.name} · {u.room.name} ({u.count})
            </option>
          ))}
        </select>
      </div>

      <div className="adm-cols">
        <section className="adm-panel">
          <div className="adm-panel__head">
            <h2>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
            <div className="adm-avail-nav">
              <button className="adm-btn" onClick={() => shiftMonth(-1)}>←</button>
              <button className="adm-btn" onClick={() => shiftMonth(1)}>→</button>
            </div>
          </div>
          <div className="adm-avail">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d} className="adm-avail__dow">{d}</span>)}
            {free.map((n, i) => {
              const date = addDays(gridFrom, i);
              const out = date.slice(0, 7) !== monthStart.slice(0, 7);
              const cls = n === 0 ? 'is-full' : n < unit.count ? 'is-some' : 'is-free';
              return (
                <span key={date} className={`adm-avail__day ${cls}${out ? ' is-out' : ''}`} title={`${day(date)}: ${n} of ${unit.count} free`}>
                  <b>{Number(date.slice(8))}</b>
                  <small>{n}/{unit.count}</small>
                </span>
              );
            })}
          </div>
          <p className="adm-muted">Each day shows rooms free that night out of the total on this floor.</p>
        </section>

        <section className="adm-panel">
          <div className="adm-panel__head"><h2>Mark dates as booked</h2></div>
          <form className="adm-block-form" onSubmit={submit}>
            <label className="adm-field"><span>First night</span><input type="date" value={arrival} min={addDays(todayISO(), -1)} onChange={e => setArrival(e.target.value)} /></label>
            <label className="adm-field"><span>Check-out day</span><input type="date" value={departure} min={arrival || todayISO()} onChange={e => setDeparture(e.target.value)} /></label>
            <label className="adm-field">
              <span>Rooms</span>
              <select value={rooms} onChange={e => setRooms(e.target.value)}>
                {Array.from({ length: unit.count }, (_, i) => String(i + 1)).map(n => <option key={n} value={n}>{n}{n === String(unit.count) ? ' (all)' : ''}</option>)}
              </select>
            </label>
            <label className="adm-field"><span>Note (optional)</span><input value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="e.g. Phone booking — Mr. Kumar" /></label>
            <button className="adm-btn adm-btn--gold" disabled={busy}>{busy ? 'Saving…' : 'Mark as booked'}</button>
            {msg && <p className="adm-muted" role="status">{msg}</p>}
          </form>
        </section>
      </div>

      <section className="adm-panel">
        <div className="adm-panel__head"><h2>Marked dates ahead</h2></div>
        {list.length ? (
          <ul className="adm-mini">
            {list.map(k => {
              const v = venues.find(x => x.id === k.place);
              const u = findUnit(v, k.floor, k.room);
              return (
                <li key={k.id}>
                  <div>
                    <strong>{v?.booking}</strong> · {u ? `${u.floor.name} · ${u.room.name}` : k.room} × {k.rooms}
                    <div className="adm-muted">{day(k.arrival)} → {day(k.departure)} · {nightsBetween(k.arrival, k.departure)} night{nightsBetween(k.arrival, k.departure) === 1 ? '' : 's'}{k.note ? ` · ${k.note}` : ''}</div>
                  </div>
                  <button className="adm-btn adm-btn--danger" onClick={() => onDelete(k)}>Free dates</button>
                </li>
              );
            })}
          </ul>
        ) : <p className="adm-muted">No dates marked. Confirmed bookings already block their rooms automatically.</p>}
      </section>
    </>
  );
}

/* ---------- Reviews ---------- */

function Reviews({ reviews, onDelete }) {
  const [place, setPlace] = useState('all');
  const [rating, setRating] = useState('all');

  const shown = reviews.filter(r =>
    (place === 'all' || r.place === place) && (rating === 'all' || r.rating === Number(rating))
  );

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Reviews <span className="adm-muted">({reviews.length})</span></h1>
      </div>
      <p className="adm-muted adm-lead">Deleting a review removes it from the public Reviews page and the home page straight away.</p>

      <div className="adm-filters">
        <select value={place} onChange={e => setPlace(e.target.value)} aria-label="Filter by place">
          <option value="all">All places</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.booking}</option>)}
        </select>
        <select value={rating} onChange={e => setRating(e.target.value)} aria-label="Filter by rating">
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
        </select>
      </div>

      {shown.length ? (
        <ul className="adm-reviews">
          {shown.map(r => (
            <li key={r.id} className="adm-review">
              <div className="adm-review__top">
                <Stars value={r.rating} />
                <span className="adm-muted">{stamp(r.date)}</span>
              </div>
              <p className="adm-quote">"{r.text}"</p>
              <div className="adm-review__foot">
                <span><strong>{r.name}</strong> · {placeName(r.place)}</span>
                <button className="adm-btn adm-btn--danger" onClick={() => onDelete(r)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-empty">{reviews.length ? 'No reviews match these filters.' : 'No reviews yet.'}</p>
      )}
    </>
  );
}
