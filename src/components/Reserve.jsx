import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { useSite } from '../site';
import { venues, rupees } from '../data/venues';
import { api } from '../lib/api';
import { fetchAvailability } from '../lib/availability';
import { freeForStay, nightsBetween, quote, todayIST, unitKey } from '../lib/stay';
import { whatsappLink } from '../lib/whatsapp';
import Lines from './Lines';
import Calendar from './Calendar';

const fmt = v => new Date(v + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtLong = v => new Date(v + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* A − n + stepper */
function Stepper({ label, note, value, min, max, onChange }) {
  return (
    <div className="rv-count">
      <div>
        <span className="rv-count__label">{label}</span>
        {note && <span className="rv-count__note">{note}</span>}
      </div>
      <div className="rv-count__ctl">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>−</button>
        <output aria-live="polite">{value}</output>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}

export default function Reserve() {
  const ref = useRef(null);
  const pathname = usePathname();
  const { location, setLocation, setStay } = useSite();
  const venue = venues.find(v => v.booking === location) ?? venues[0];
  const multiFloor = venue.inventory.length > 1;

  const [floorId, setFloorId] = useState(venue.inventory[0].id);
  const [roomId, setRoomId] = useState(Object.keys(venue.inventory[0].rooms)[0]);
  const [dates, setDates] = useState({ arrival: '', departure: '' });
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [availAll, setAvailAll] = useState({}); // place id → { from, free } (or { error })
  // Dates come first everywhere; on a place's own page the place is already chosen too
  // On a place's own page the place is already chosen, so start one step in
  const [open, setOpen] = useState(() => (pathname?.startsWith('/places/') ? (multiFloor ? 'floor' : 'room') : 'place'));
  const [datesOpen, setDatesOpen] = useState(false); // the date drop-down above the steps
  const datesRef = useRef(null);
  const [touched, setTouched] = useState(() => new Set(pathname?.startsWith('/places/') ? ['place'] : []));
  // Floor and room stay blank until the guest picks them (a one-floor place has its floor settled)
  const [roomPicked, setRoomPicked] = useState(false);
  const floorPicked = !multiFloor || touched.has('floor');

  // A new place starts on its first floor and room type
  useEffect(() => {
    const floor = venue.inventory[0];
    setFloorId(floor.id);
    setRoomId(Object.keys(floor.rooms)[0]);
    setRooms(1);
    setGuests(g => Math.min(g, venue.rooms[0].sleeps));
    setRoomPicked(false);
    setTouched(t => { const n = new Set(t); n.delete('floor'); n.delete('room'); return n; });
  }, [venue]);

  // Availability for every place, so once the dates are known each place can say what it has free
  const loadAvailability = (id, fresh = false) => {
    fetchAvailability(id, { fresh })
      .then(data => setAvailAll(a => ({ ...a, [id]: data })))
      .catch(() => setAvailAll(a => ({ ...a, [id]: { error: true } })));
  };
  useEffect(() => { venues.forEach(v => loadAvailability(v.id)); }, []);
  const avail = availAll[venue.id] ?? null;

  const floor = venue.inventory.find(f => f.id === floorId) ?? venue.inventory[0];
  const room = venue.rooms.find(r => r.id === roomId && floor.rooms[r.id]) ?? venue.rooms.find(r => floor.rooms[r.id]);
  const count = floor.rooms[room.id];
  const { arrival, departure } = dates;
  const nights = arrival && departure ? nightsBetween(arrival, departure) : 0;
  const from = avail?.from ?? todayIST();
  const nightWord = venue.id === 'kochadai' ? 'day' : 'night';

  // How many of a room are free for the chosen dates (all of them until dates are picked)
  const freeAt = (v, fId, rId) => {
    const total = v.inventory.find(f => f.id === fId).rooms[rId];
    const a = availAll[v.id];
    if (!nights || !a?.free) return total;
    return freeForStay(a.free[unitKey(fId, rId)], a.from, arrival, departure);
  };
  const freeFor = (fId, rId) => freeAt(venue, fId, rId);
  const freeOnFloor = (v, f) => Object.keys(f.rooms).reduce((sum, rId) => sum + freeAt(v, f.id, rId), 0);
  const freeInPlace = v => v.inventory.reduce((sum, f) => sum + freeOnFloor(v, f), 0);
  const known = v => nights > 0 && !!availAll[v.id]?.free; // free counts are real, not just totals
  const left = freeFor(floor.id, room.id);
  const maxRooms = Math.max(1, Math.min(count, left || count));
  const fits = rooms * room.sleeps >= guests;
  const price = nights && roomPicked ? quote(room.price, rooms, nights) : null;
  const gstPct = Math.round((price?.gstRate ?? (room.price <= 7500 ? 0.05 : 0.18)) * 100);

  // Keep the counts sensible when the room or dates change
  useEffect(() => { setRooms(r => Math.min(Math.max(1, r), maxRooms)); }, [maxRooms]);

  const changeGuests = n => {
    const g = Math.max(1, Math.min(n, maxRooms * room.sleeps));
    setGuests(g);
    setRooms(r => Math.max(r, Math.min(maxRooms, Math.ceil(g / room.sleeps))));
  };

  const go = (done, next) => {
    setTouched(t => new Set(t).add(done));
    setOpen(next);
    setMessage('');
  };

  const choosePlace = v => {
    setLocation(v.booking);
    go('place', v.inventory.length > 1 ? 'floor' : 'room');
  };
  const chooseFloor = f => {
    setFloorId(f.id);
    if (!f.rooms[roomId]) { setRoomId(Object.keys(f.rooms)[0]); setRoomPicked(false); }
    go('floor', 'room');
  };
  const chooseDates = d => {
    setDates(d);
    setMessage('');
    if (d.arrival && d.departure) setDatesOpen(false);
  };

  // The date drop-down closes on a click outside it or on Escape
  useEffect(() => {
    if (!datesOpen) return;
    const onDown = e => { if (!datesRef.current?.contains(e.target)) setDatesOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setDatesOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [datesOpen]);

  // Calendar: once the place is settled, nights when it is completely full are closed
  const calendarFree = touched.has('place') && avail?.free && Object.keys(avail.free).length
    ? Object.values(avail.free).reduce((sum, perNight) => sum.map((x, i) => x + (perNight[i] ?? 0)))
    : null;

  // Shared with the floating WhatsApp button, so its message carries this stay
  useEffect(() => {
    setStay({ location: venue.booking, floorName: multiFloor && floorPicked ? floor.name : '', roomName: roomPicked ? room.name : '', arrival, departure, guests });
  }, [venue, multiFloor, floor, room, floorPicked, roomPicked, arrival, departure, guests, setStay]);

  useGSAP(() => {
    if (reduceMotion) return;
    gsap.timeline({ scrollTrigger: { trigger: '.rv', start: 'top 82%' } })
      .fromTo('.rv', { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
      .from('.rv__photos', { scale: 1.2, duration: 2.2, ease: 'expo.out' }, 0.2)
      .from('.rv__visual-head > *, .rv-folio', { opacity: 0, y: 24, duration: 1.2, stagger: 0.08, ease: 'expo.out' }, 0.8)
      .from('.rv-pane, .rv-nav', { opacity: 0, x: 30, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, 0.7);
    gsap.from('.reserve__glow', {
      opacity: 0, scale: 0.7, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'center center', scrub: true }
    });
  }, { scope: ref });

  // Saved on the server as a booking request; the team confirms it from the admin dashboard (/admin)
  const submit = async e => {
    e.preventDefault();
    if (sending) return;
    if (!arrival || !departure) { setDatesOpen(true); return setMessage('Kindly choose your arrival and departure days.'); }
    if (!floorPicked) { setOpen('floor'); return setMessage('Kindly choose a floor.'); }
    if (!roomPicked) { setOpen('room'); return setMessage('Kindly choose a room.'); }
    if (left < rooms) { setOpen('room'); return setMessage('This room is not free for all of those nights. Try another room, floor or dates.'); }
    if (!fits) { setOpen('room'); return setMessage(`${room.name} sleeps ${room.sleeps} — kindly add a room for ${guests} guests.`); }
    if (!name.trim()) return setMessage('Kindly add your name.');
    if ((phone.match(/\d/g) || []).length < 7) return setMessage('Kindly add a phone number we can reach you on.');

    setSending(true);
    setMessage('');
    try {
      await api('/bookings', {
        method: 'POST',
        body: { name: name.trim(), phone: phone.trim(), place: venue.id, floor: floor.id, room: room.id, rooms, guests, arrival, departure }
      });
      setMessage(`Thank you, ${name.trim()}. Our ${venue.name} desk will call you shortly to confirm your ${room.name.toLowerCase()} for ${fmt(arrival)} – ${fmt(departure)}.`);
      setName(''); setPhone(''); setDates({ arrival: '', departure: '' });
    } catch (err) {
      setMessage(err.message);
      if (err.status === 409) { loadAvailability(venue.id, true); setOpen('room'); }
    } finally {
      setSending(false);
    }
  };

  const floorRooms = venue.rooms.filter(r => floor.rooms[r.id]);
  const fromPrice = f => Math.min(...venue.rooms.filter(r => f.rooms[r.id]).map(r => r.price));

  const steps = [
    { id: 'place', title: 'The place', ask: nights ? `Rooms free for ${fmt(arrival)} – ${fmt(departure)}.` : 'Where would you like to stay?', value: venue.name },
    multiFloor && { id: 'floor', title: 'The floor', ask: nights ? 'Free rooms on each floor for your dates.' : 'Choose a floor of the house.', value: floor.name },
    { id: 'room', title: multiFloor ? 'The room' : 'The stay', ask: nights ? 'Rooms free for your dates — pick one and who is coming.' : 'Pick your room and who is coming.', value: `${room.name} · ${plural(guests, 'guest')}` },
    { id: 'guest', title: 'Your details', ask: 'Where can our desk reach you?', value: name.trim() }
  ].filter(Boolean);
  // a place without floors has no floor step: open the room instead
  const current = open === 'floor' && !multiFloor ? 'room' : open;
  const at = steps.findIndex(s => s.id === current);
  const step = steps[at];

  // What has to be settled before moving on from each step
  const blocker = {
    floor: !floorPicked && 'Choose a floor.',
    room: (!nights && 'Choose your arrival and departure days above.')
      || (!roomPicked && 'Choose a room.')
      || (left < rooms && `${room.name} is not free for all these nights — pick another room, floor or dates.`)
      || (!fits && `${room.name} sleeps ${room.sleeps} — add a room for ${plural(guests, 'guest')}.`)
  }[current];
  const next = () => {
    if (blocker) { if (!nights) setDatesOpen(true); return setMessage(blocker); }
    if (at < steps.length - 1) go(current, steps[at + 1].id);
  };
  const prev = () => { if (at > 0) { setOpen(steps[at - 1].id); setMessage(''); } };

  const body = id => {
    if (id === 'place') return (
      <div className="rv-places">
        {venues.map(v => (
          <button type="button" key={v.id} className={`rv-place${v.id === venue.id ? ' is-on' : ''}`} aria-pressed={v.id === venue.id} onClick={() => choosePlace(v)}>
            <img src={v.cover.src} alt="" loading="lazy" />
            <span className="rv-place__text">
              <small>{v.type}</small>
              <b>{v.name}</b>
              <em>from {rupees(Math.min(...v.rooms.map(r => r.price)))}</em>
              {known(v) && <span className={`rv-place__free${freeInPlace(v) ? '' : ' is-none'}`}>{freeInPlace(v) ? `${plural(freeInPlace(v), 'room')} free` : 'Fully booked'}</span>}
            </span>
          </button>
        ))}
      </div>
    );

    if (id === 'floor') return (
      // top floor first, like a building's directory
      <ol className="rv-floors">
        {[...venue.inventory].reverse().map(f => {
          const total = Object.values(f.rooms).reduce((a, b) => a + b, 0);
          return (
            <li key={f.id}>
              <button type="button" className={floorPicked && f.id === floor.id ? 'is-on' : undefined} aria-pressed={floorPicked && f.id === floor.id} onClick={() => chooseFloor(f)}>
                <span className="rv-floors__name">{f.name}</span>
                <span className="rv-floors__types">{venue.rooms.filter(r => f.rooms[r.id]).map(r => r.name).join(' · ')}</span>
                <i aria-hidden="true" />
                <span className="rv-floors__meta">{known(venue) ? `${freeOnFloor(venue, f)} of ${total} free` : plural(total, 'room')} · from {rupees(fromPrice(f))}</span>
              </button>
            </li>
          );
        })}
      </ol>
    );

    if (id === 'room') return (
      <>
        <div className="rv-rooms">
          {floorRooms.map(r => {
            const n = freeFor(floor.id, r.id);
            const full = nights > 0 && avail?.free && n === 0;
            return (
              <button
                type="button"
                key={r.id}
                className={['rv-room', roomPicked && r.id === room.id && 'is-on', full && 'is-full'].filter(Boolean).join(' ')}
                aria-pressed={roomPicked && r.id === room.id}
                onClick={() => { setRoomId(r.id); setRoomPicked(true); setMessage(''); }}
              >
                <span className="rv-room__name">{r.name}</span>
                <span className="rv-room__note">{r.note}</span>
                <span className="rv-room__price">{rupees(r.price)}<small>{r.unit}</small></span>
                <span className="rv-room__meta">
                  Sleeps {r.sleeps} ·{' '}
                  {nights && avail?.free
                    ? (full ? 'booked for your dates' : floor.rooms[r.id] === 1 ? 'free for your dates' : `${n} free for your dates`)
                    : floor.rooms[r.id] === 1 && !multiFloor ? 'the entire place' : `${plural(floor.rooms[r.id], 'room')} on this floor`}
                </span>
              </button>
            );
          })}
        </div>
        {nights > 0 && left < rooms && <p className="rv-warn">{room.name} is not free for all these nights — pick another room or floor.</p>}
        <div className="rv-counts">
          <Stepper label="Guests" note={`${room.name} sleeps ${room.sleeps}`} value={guests} min={1} max={maxRooms * room.sleeps} onChange={changeGuests} />
          {count > 1 && <Stepper label="Rooms" note={`${count} on this floor`} value={rooms} min={Math.ceil(guests / room.sleeps)} max={maxRooms} onChange={n => setRooms(Math.max(1, Math.min(n, maxRooms)))} />}
        </div>
      </>
    );

    return (
      <div className="rv-guest">
        <div className="rv-guest__fields">
          <label className="field">
            <span>Your name</span>
            <input value={name} maxLength={80} onChange={e => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input type="tel" value={phone} maxLength={30} onChange={e => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
          </label>
        </div>
        <div className="rv-guest__send">
          <button type="submit" className="btn-gold" disabled={sending}>
            <span>{sending ? 'Sending…' : price ? `Request booking · ${rupees(price.total)}` : 'Request booking'}</span>
          </button>
          <a className="rv-wa" target="_blank" rel="noopener" href={whatsappLink({ location: venue.booking, floorName: multiFloor && floorPicked ? floor.name : '', roomName: roomPicked ? room.name : '', arrival, departure, guests })}>
            or reserve on WhatsApp
          </a>
        </div>
        <p className="rv-fine">No payment now — the desk calls to confirm. Final bill may vary.</p>
      </div>
    );
  };

  // Each new step slides in from the side it was reached from
  const lastAt = useRef(at);
  useGSAP(() => {
    const dir = Math.sign(at - lastAt.current);
    lastAt.current = at;
    if (reduceMotion || !dir) return;
    gsap.fromTo('.rv-pane', { opacity: 0, x: dir * 48 }, { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out' });
  }, { scope: ref, dependencies: [at], revertOnUpdate: false });

  return (
    <section className="reserve" id="reserve" ref={ref}>
      <div className="reserve__glow" aria-hidden="true" />
      <p className="eyebrow">Reservations</p>
      <Lines className="display display--xl" lines={['Your stay,', <em>awaits.</em>]} />

      <form className="rv" noValidate onSubmit={submit}>
        {/* The place, in pictures, with the running folio */}
        <aside className="rv__visual">
          <div className="rv__photos" aria-hidden="true">
            {venues.map(v => <img key={v.id} src={v.cover.src} alt="" className={v.id === venue.id ? 'is-on' : undefined} loading="lazy" />)}
          </div>
          <div className="rv__visual-head">
            <p className="rv__eyebrow">Reserving at</p>
            <p className="rv__name" key={venue.id}>{venue.name}</p>
            <p className="rv__type">{venue.type} · {venue.area.split(' · ')[0]}</p>
          </div>

          <div className="rv-folio" aria-live="polite">
            <div className="rv-folio__row"><span>Room</span><i /><b>{roomPicked ? `${room.name}${rooms > 1 ? ` × ${rooms}` : ''}` : '—'}</b></div>
            {multiFloor && <div className="rv-folio__row"><span>Floor</span><i /><b>{floorPicked ? floor.name : '—'}</b></div>}
            <div className="rv-folio__row"><span>Arrival</span><i /><b>{arrival ? fmtLong(arrival) : '—'}</b></div>
            <div className="rv-folio__row"><span>Departure</span><i /><b>{departure ? fmtLong(departure) : '—'}</b></div>
            <div className="rv-folio__row"><span>Guests</span><i /><b>{guests}</b></div>
            <div className="rv-folio__rule" />
            <div className="rv-folio__row rv-folio__row--sm">
              <span>{roomPicked ? `${rupees(room.price)} × ${nights ? plural(nights, nightWord) : `per ${nightWord}`}${rooms > 1 ? ` × ${rooms}` : ''}` : 'Room rate'}</span><i /><b>{price ? rupees(price.subtotal) : '—'}</b>
            </div>
            <div className="rv-folio__row rv-folio__row--sm"><span>{roomPicked ? `GST ${gstPct}%` : 'GST'}</span><i /><b>{price ? rupees(price.gst) : '—'}</b></div>
            <div className="rv-folio__total">
              <span>Estimated total</span>
              <b className={price ? undefined : 'is-empty'}>{price ? rupees(price.total) : !nights ? 'Select your dates' : 'Select your room'}</b>
            </div>
          </div>
        </aside>

        {/* The reservation, one step at a time */}
        <div className="rv__flow">
          {/* Dates first: a compact drop-down that stays at the top of every step */}
          <div className={`rv-dates${datesOpen ? ' is-open' : ''}`} ref={datesRef}>
            <button type="button" className="rv-dates__bar" onClick={() => setDatesOpen(o => !o)} aria-expanded={datesOpen}>
              <span className="rv-dates__part">
                <small>Arrival</small>
                <b className={arrival ? undefined : 'is-empty'}>{arrival ? fmtLong(arrival) : 'Add date'}</b>
              </span>
              <i className="rv-dates__sep" aria-hidden="true">→</i>
              <span className="rv-dates__part">
                <small>Departure</small>
                <b className={departure ? undefined : 'is-empty'}>{departure ? fmtLong(departure) : 'Add date'}</b>
              </span>
              <span className="rv-dates__nights">{nights ? plural(nights, nightWord) : 'Your dates'}</span>
              <span className="rv-dates__chev" aria-hidden="true" />
            </button>
            {datesOpen && (
              <div className="rv-dates__drop">
                {avail?.error && <p className="rv-note">Live availability could not be loaded — you can still send a request and the desk will confirm.</p>}
                <Calendar from={calendarFree ? from : todayIST()} free={calendarFree} need={1} arrival={arrival} departure={departure} onChange={chooseDates} />
              </div>
            )}
          </div>

          <div className="rv-pane" key={current}>
            <header className="rv-pane__head">
              <h3 className="rv-pane__title">{step.title}</h3>
              <p className="rv-pane__ask">{step.ask}</p>
            </header>
            <div className="rv-pane__body">{body(current)}</div>
          </div>

          <p className="booking__msg" role="status" aria-live="polite">{message}</p>

          <nav className="rv-nav" aria-label="Booking steps">
            <button type="button" className="rv-nav__btn rv-nav__btn--prev" onClick={prev} disabled={at === 0}>
              <i aria-hidden="true">←</i> Previous
            </button>
            <span className="rv-nav__dots" aria-hidden="true">
              {steps.map((s, i) => <i key={s.id} className={i === at ? 'is-on' : i < at ? 'is-past' : undefined} />)}
            </span>
            {at < steps.length - 1 ? (
              <button type="button" className="rv-nav__btn rv-nav__btn--next" onClick={next}>
                Next<span className="rv-nav__to"> · {steps[at + 1].title}</span> <i aria-hidden="true">→</i>
              </button>
            ) : (
              <span className="rv-nav__end">Last step</span>
            )}
          </nav>
        </div>
      </form>
    </section>
  );
}
