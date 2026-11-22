export type BookingStatus = 'new' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  created: string;
  status: BookingStatus;
  place: string;
  room: string;
  floor: string;
  arrival: string;   // YYYY-MM-DD
  departure: string; // YYYY-MM-DD
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  // Extended fields
  roomNumber?: string;
  roomNumbers?: string[]; // assigned when confirmed, one per room booked
  rooms?: number;
  bookingChannel?: 'website' | 'in_person';
  paymentMode?: 'cash' | 'gpay' | 'card' | 'pending';
  totalAmount?: number;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  created: string;
  status: ReviewStatus;
  place: string;
  author: string;
  rating: number; // 1 to 5
  comment: string;
}

export interface RoomBlock {
  id: string;
  created: string;
  place: string;
  room: string;
  floor: string;
  arrival: string;   // YYYY-MM-DD
  departure: string; // YYYY-MM-DD
  reason?: string;
}

// Front-Desk / Room Layout Admin Reservation (Saved directly to Insights)
export interface FrontDeskReservation {
  id: string;
  created: string;
  place: string;
  floor: string;
  floorName: string;
  room: string;
  roomName: string;
  roomNumber: string;
  bookingChannel: 'in_person' | 'website';
  paymentMode: 'cash' | 'gpay' | 'card';
  name: string;
  phone: string;
  arrival: string;
  departure: string;
  nights: number;
  ratePerNight: number;
  subtotal: number;
  gst: number;
  total: number;
}

export interface RoomType {
  id: string;
  name: string;
  note: string;
  price: number;
  unit: string;
  sleeps: number;
}

export interface InventoryFloor {
  id: string;
  name: string;
  rooms: Record<string, number>;
}

export interface VenueCover {
  src: string;
  wide: string;
  home?: string;
  homeWhole?: boolean;
  alt: string;
}

export interface VenuePin {
  lat: number;
  lng: number;
  label: string;
}

export interface Venue {
  id: string;
  num: string;
  name: string;
  area: string;
  type: string;
  booking: string;
  cover: VenueCover;
  desc: string;
  teaser?: string; // short version for the home page carousel (falls back to desc)
  stats: [string, string][];
  facts: [string, string][];
  floors?: [string, string][];
  rooms: RoomType[];
  inventory: InventoryFloor[];
  backdrop?: { src: string; small: string };
  pin: VenuePin;
  directions: string;
  photos: string[];
  googleReviewUrl?: string;
  googleRating?: number;
  googleReviewCount?: number;
}
