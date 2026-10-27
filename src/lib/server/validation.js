import { randomUUID } from 'node:crypto';
import { venues } from '../../data/venues';
import { addDays, findUnit, freeByNight, freeForStay, nightsBetween, quote, todayIST, unitKey } from '../stay';
import { getStore } from './store';

const placeIds = new Set(venues.map(v => v.id));
export const venueById = id => venues.find(v => v.id === id);
export const WINDOW = 400;
export const STATUSES = ['new', 'confirmed', 'cancelled'];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
export const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function parseReview(body) {
  const review = {
    id: randomUUID(),
    name: text(body.name, 60),
    place: body.place,
    rating: body.rating,
    text: text(body.text, 600),
    date: new Date().toISOString()
  };
  if (!review.name) throw new HttpError(400, 'Please add your name.');
  if (!placeIds.has(review.place)) throw new HttpError(400, 'Unknown place.');
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) throw new HttpError(400, 'Please choose a rating.');
  if (review.text.length < 10) throw new HttpError(400, 'Please write at least 10 characters.');
  return review;
}

export function parseStay(body) {
  const venue = venueById(body.place);
  if (!venue) throw new HttpError(400, 'Unknown place.');
  const unit = findUnit(venue, body.floor, body.room);
  if (!unit) throw new HttpError(400, 'Please choose a floor and room.');
  const { arrival, departure } = body;
  const earliest = addDays(todayIST(), -1);
  if (!isDate(arrival) || !isDate(departure)) throw new HttpError(400, 'Kindly choose your arrival and departure dates.');
  if (arrival < earliest) throw new HttpError(400, 'Arrival date is in the past.');
  if (departure <= arrival) throw new HttpError(400, 'Departure should be after arrival.');
  if (departure > addDays(todayIST(), WINDOW)) throw new HttpError(400, 'We take bookings up to a year ahead.');
  const rooms = body.rooms ?? 1;
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > unit.count) throw new HttpError(400, `This floor has ${unit.count} such room${unit.count > 1 ? 's' : ''}.`);
  return { venue, unit, arrival, departure, rooms };
}

export function parseBooking(body) {
  const { venue, unit, arrival, departure, rooms } = parseStay(body);
  const guests = body.guests;
  if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, 'Please choose the number of guests.');
  if (guests > rooms * unit.room.sleeps) throw new HttpError(400, `${unit.room.name} sleeps ${unit.room.sleeps} — please add a room for ${guests} guests.`);

  const booking = {
    id: randomUUID(),
    name: text(body.name, 80),
    phone: text(body.phone, 30),
    email: text(body.email, 120),
    place: venue.id,
    location: venue.booking,
    floor: unit.floor.id,
    floorName: unit.floor.name,
    room: unit.room.id,
    roomName: unit.room.name,
    rooms,
    arrival,
    departure,
    guests,
    estimate: quote(unit.room.price, rooms, nightsBetween(arrival, departure)),
    note: text(body.note, 500),
    status: 'new',
    createdAt: new Date().toISOString()
  };
  if (!booking.name) throw new HttpError(400, 'Please add your name.');
  if ((booking.phone.match(/\d/g) || []).length < 7 || /[^\d\s+()-]/.test(booking.phone)) {
    throw new HttpError(400, 'Please add a valid phone number.');
  }
  if (booking.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) throw new HttpError(400, 'Please check your email address.');
  return booking;
}

export const takenAt = (placeId, skipId) => {
  const store = getStore();
  return [
    ...store.bookings.all().filter(b => b.place === placeId && b.status === 'confirmed' && b.room && b.id !== skipId),
    ...store.blocks.all().filter(b => b.place === placeId)
  ];
};

export function getAvailability(venue, skipId) {
  const from = todayIST();
  return { from, days: WINDOW, free: freeByNight(venue, takenAt(venue.id, skipId), from, WINDOW) };
}

export function assertFree({ place, floor, room, rooms, arrival, departure }, skipId, message) {
  const { from, free } = getAvailability(venueById(place), skipId);
  const nights = free[unitKey(floor, room)];
  const start = arrival < from ? from : arrival;
  if (departure > start && freeForStay(nights, from, start, departure) < rooms) throw new HttpError(409, message);
}
