import { kodaikanalPhotos, arapalayamPhotos, kochadaiPhotos } from './photos.js';

const maps = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/*
  Each place:
  - stats:   three headline figures shown under the description
  - facts:   the details list beside the map
  - floors:  how the building is laid out (optional)
  - cover:   tall photo for the place boxes (src) and a wide one for landscape boxes (wide)
  - rooms:   room types and rates (id is used by bookings; sleeps = guests per room)
  - inventory: how many rooms of each type are on each floor. The booking form and the
             availability calendar are built from this, so keep it in step with the real building.
  - backdrop: optional photo fixed behind the place page (position: optional CSS object-position)
  - pin:     map position. These are the neighbourhood centres from OpenStreetMap —
             replace with the exact building coordinates (right-click the spot in
             Google Maps to copy them) for a precise pin.
*/
export const venues = [
  {
    id: 'kodaikanal',
    num: 'I',
    name: 'Kodaikanal',
    area: 'Kodaikanal · Vilpatti',
    type: 'Adventure Resort',
    booking: 'Kodaikanal',
    cover: { src: '/assets/gallery/kodaikanal/cover.webp', wide: '/assets/gallery/kodaikanal/cover-wide.webp', alt: 'Aerial view of the Kodaikanal resort on a wooded hilltop, with the Kodaikanal Hills and clouds beyond' },
    desc: 'SKR SIVABHAGYA, nestled atop a hill in Villpatti, Kodaikanal, offers breathtaking 360° panoramic views. Just a 15-minute drive from Kodaikanal Lake, it promises an exceptional mountain retreat. Experience world-class comfort in our elegant rooms and luxurious suites. Watch the mist embrace the hills as the skies feel beautifully within reach. Reconnect with nature through scenic treks across nearby valleys and hilltops. Begin your day with a wholesome breakfast at our restaurant. End it with a specially curated menu featuring delightful local favourites.',
    stats: [['10', 'Rooms'], ['G + 2', 'Floors'], ['₹6,000', 'Rooms from']],
    facts: [
      ['Setting', 'Hillside at Vilpatti, with panoramic valley views'],
      ['Dining', 'In-house restaurant with mountain-facing windows'],
      ['Grounds', 'Open lawns, lounge & covered parking']
    ],
    floors: [
      ['Ground floor', 'Reception, dining & lounge'],
      ['First floor', '4 rooms — all twin bedrooms'],
      ['Second floor', '6 bedrooms']
    ],
    rooms: [
      { id: 'suite', name: 'Suite', note: 'Our most spacious rooms, with room to spread out', price: 12000, unit: 'per night', sleeps: 3 },
      { id: 'deluxe', name: 'Deluxe Room', note: 'Comfortable rooms in wood, linen & soft light', price: 6000, unit: 'per night', sleeps: 2 }
    ],
    inventory: [
      { id: 'first', name: 'First floor', rooms: { deluxe: 4 } },
      { id: 'second', name: 'Second floor', rooms: { suite: 2, deluxe: 4 } }
    ],
    // Optional: a photo fixed behind the whole place page
    backdrop: { src: '/assets/gallery/kodaikanal/backdrop.webp', small: '/assets/gallery/kodaikanal/backdrop-sm.webp' },
    pin: { lat: 10.2696, lng: 77.5043, label: 'Vilpatti, Kodaikanal' },
    directions: maps('Vilpatti, Kodaikanal, Tamil Nadu'),
    photos: kodaikanalPhotos
  },
  {
    id: 'arapalayam',
    num: 'II',
    name: 'Aarapalayam',
    area: 'Madurai · Aarapalayam',
    type: 'Business Class Hotel',
    booking: 'Madurai — Aarapalayam',
    cover: { src: '/assets/gallery/arapalayam/cover.webp', wide: '/assets/gallery/arapalayam/cover-wide.webp', alt: 'Entrance to the restaurant at the Aarapalayam hotel, with a brass lamp and chandelier' },
    desc: 'In the heart of the temple city, minutes from the Meenakshi Amman Temple — a business class hotel of dark wood, warm light and quiet rooms, made for rest after a long day.',
    stats: [['40', 'Rooms'], ['G + 4', 'Floors'], ['₹1,900', 'Rooms from']],
    facts: [
      ['Amenities', 'Restaurant, coffee shop, conference hall, Wi-Fi'],
      ['Services', 'Travel desk, laundry, doctor on call, parking'],
      ['Distances', 'Railway station 4 km · Meenakshi Temple 5 km · Airport 15 km'],
      ['Address', '47, D.D. Main Road, Arappalayam, Madurai 625016']
    ],
    floors: [
      ['First floor', '10 rooms'],
      ['Second floor', '10 rooms'],
      ['Third floor', '10 rooms'],
      ['Fourth floor', '6 rooms'],
      ['Terrace', '4 rooms']
    ],
    rooms: [
      { id: 'standard', name: 'Standard', note: 'Well-appointed rooms for a restful stay', price: 1900, unit: 'per night', sleeps: 2 },
      { id: 'deluxe', name: 'Deluxe', note: 'More space, more comfort', price: 2500, unit: 'per night', sleeps: 2 },
      { id: 'premium', name: 'Premium', note: 'Generous rooms with added touches', price: 3500, unit: 'per night', sleeps: 3 },
      { id: 'superior', name: 'Superior', note: 'Our finest rooms in the city', price: 4500, unit: 'per night', sleeps: 3 }
    ],
    inventory: [
      { id: 'first', name: 'First floor', rooms: { standard: 10 } },
      { id: 'second', name: 'Second floor', rooms: { deluxe: 10 } },
      { id: 'third', name: 'Third floor', rooms: { premium: 10 } },
      { id: 'fourth', name: 'Fourth floor', rooms: { superior: 6 } },
      { id: 'terrace', name: 'Terrace', rooms: { superior: 4 } }
    ],
    backdrop: { src: '/assets/gallery/arapalayam/backdrop.webp', small: '/assets/gallery/arapalayam/backdrop-sm.webp', position: '40% 55%' },
    pin: { lat: 9.9342, lng: 78.103, label: '47, D.D. Main Road, Arappalayam' },
    directions: maps('47 D.D. Main Road Arappalayam Madurai 625016'),
    photos: arapalayamPhotos
  },
  {
    id: 'kochadai',
    num: 'III',
    name: 'Kochadai',
    area: 'Madurai · Kochadai',
    type: 'Service Apartment',
    booking: 'Madurai — Kochadai',
    cover: { src: '/assets/gallery/kochadai/cover.webp', wide: '/assets/gallery/kochadai/cover-wide.webp', alt: 'The Kochadai service apartment building lit up at dusk' },
    desc: 'A private, fully equipped home in the Annai Bharath community — for families and groups who want the freedom of a house with the care of a hotel.',
    stats: [['3', 'Bedrooms'], ['1', 'Jacuzzi'], ['₹13,000', 'Per day + taxes']],
    facts: [
      ['Community', 'Annai Bharath community, Kochadai'],
      ['Spaces', '3 bedrooms, 1 hall, 1 kitchen'],
      ['Leisure', 'Jacuzzi, garden area, party area & terrace view point'],
      ['Arrival', 'Car portico'],
      ['Please note', 'No swimming pool']
    ],
    rooms: [
      { id: 'apartment', name: 'Entire Apartment', note: '3 bedrooms, hall, kitchen, garden, terrace & jacuzzi', price: 13000, unit: 'per day + taxes', sleeps: 8 }
    ],
    inventory: [
      { id: 'house', name: 'Whole house', rooms: { apartment: 1 } }
    ],
    backdrop: { src: '/assets/gallery/kochadai/backdrop.webp', small: '/assets/gallery/kochadai/backdrop-sm.webp', position: '30% 50%' },
    pin: { lat: 9.9405, lng: 78.084, label: 'Annai Bharath community, Kochadai' },
    directions: maps('Kochadai, Madurai, Tamil Nadu'),
    photos: kochadaiPhotos
  }
];

export const contact = {
  phones: ['+91 90039 44559', '+91 90950 44558'],
  email: 'sivabhagya4@gmail.com',
  whatsapp: '919043116373' // country code + number, digits only
};

export const rupees = n => `₹${n.toLocaleString('en-IN')}`;
