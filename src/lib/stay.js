/*
  Stay maths shared by the website and the server: dates, prices and room availability.
  Dates are 'YYYY-MM-DD' strings; a stay covers the nights from arrival up to (not including) departure.
*/
const DAY = 864e5;

export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const nightsBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

/* Today in India, whatever the clock of the server or visitor */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/* GST on hotel rooms: 5% up to ₹7,500 a night, 18% above */
export const gstRate = nightly => (nightly <= 7500 ? 0.05 : 0.18);

export function quote(nightly, rooms, nights) {
  const subtotal = nightly * rooms * nights;
  const rate = gstRate(nightly);
  const gst = Math.round(subtotal * rate);
  return { nightly, rooms, nights, subtotal, gstRate: rate, gst, total: subtotal + gst };
}

/* A floor + room type at a place, with how many such rooms that floor has */
export function findUnit(venue, floorId, roomId) {
  const floor = venue?.inventory.find(f => f.id === floorId);
  const room = venue?.rooms.find(r => r.id === roomId);
  const count = floor?.rooms[roomId];
  return floor && room && count ? { floor, room, count } : null;
}

export const unitKey = (floorId, roomId) => `${floorId}|${roomId}`;

/*
  Rooms still free each night, for every floor + room type at a place.
  taken: confirmed bookings and blocked dates, each { floor, room, rooms, arrival, departure }.
  Returns { 'floor|room': [free on night 0, night 1, …] } counted from `from`.
*/
export function freeByNight(venue, taken, from, days) {
  const free = {};
  for (const floor of venue.inventory) {
    for (const [roomId, count] of Object.entries(floor.rooms)) free[unitKey(floor.id, roomId)] = Array(days).fill(count);
  }
  for (const t of taken) {
    const nights = free[unitKey(t.floor, t.room)];
    if (!nights) continue;
    const start = Math.max(0, nightsBetween(from, t.arrival));
    const end = Math.min(days, nightsBetween(from, t.departure));
    for (let i = start; i < end; i++) nights[i] = Math.max(0, nights[i] - (t.rooms || 1));
  }
  return free;
}

/* Fewest rooms free on any night of a stay (0 when any night is full or outside the window) */
export function freeForStay(nights, from, arrival, departure) {
  if (!nights || !arrival || !departure) return 0;
  const start = nightsBetween(from, arrival);
  const end = nightsBetween(from, departure);
  if (start < 0 || end > nights.length || end <= start) return 0;
  return Math.min(...nights.slice(start, end));
}

/*
  Room numbers on a floor: first floor 101, 102…, second 201…, terrace 501…
  Numbers run through the floor's room types in order (e.g. 2 suites = 201–202, then deluxe 203–206).
  Pass roomId to get only that type's numbers.
*/
const FLOOR_NO = { first: 1, second: 2, third: 3, fourth: 4, terrace: 5, house: 1 };
export const floorPrefix = floorId => (FLOOR_NO[floorId] || 1) * 100;

export function roomNumbers(floor, roomId) {
  let n = floorPrefix(floor.id);
  const out = [];
  for (const [id, count] of Object.entries(floor.rooms)) {
    for (let i = 0; i < count; i++) {
      n++;
      if (!roomId || id === roomId) out.push(String(n));
    }
  }
  return out;
}

/* Two stays overlap when each starts before the other ends */
export const overlaps = (a, b) => a.arrival < b.departure && b.arrival < a.departure;
