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
  stats: [string, string][];
  facts: [string, string][];
  floors?: [string, string][];
  rooms: RoomType[];
  inventory: InventoryFloor[];
  backdrop?: { src: string; small: string };
  pin: VenuePin;
  directions: string;
  photos: string[];
}
