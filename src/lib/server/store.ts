import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Booking, Review, RoomBlock, FrontDeskReservation } from '@/types';

interface StoreData {
  reviews: Review[];
  bookings: Booking[];
  blocks: RoomBlock[];
  reservations: FrontDeskReservation[];
}

export interface Collection<T extends { id: string }> {
  all: () => T[];
  add: (item: T) => T;
  update: (id: string, changes: Partial<T>) => T | null;
  remove: (id: string) => boolean;
}

export interface StoreInstance {
  file: string;
  reviews: Collection<Review>;
  bookings: Collection<Booking>;
  blocks: Collection<RoomBlock>;
  reservations: Collection<FrontDeskReservation>;
}

let globalStoreInstance: StoreInstance | null = null;

export function openStore(dir = process.env.DATA_DIR || 'data'): StoreInstance {
  if (globalStoreInstance) return globalStoreInstance;

  const folder = dir || 'data';
  const dataDir = join(process.cwd(), folder === 'data' ? 'data' : folder);
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, 'db.json');

  let data: StoreData = { reviews: [], bookings: [], blocks: [], reservations: [] };
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    data = {
      reviews: Array.isArray(saved.reviews) ? saved.reviews : [],
      bookings: Array.isArray(saved.bookings) ? saved.bookings : [],
      blocks: Array.isArray(saved.blocks) ? saved.blocks : [],
      reservations: Array.isArray(saved.reservations) ? saved.reservations : []
    };
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw new Error(`Could not read ${file}: ${err.message}`);
  }

  const save = () => {
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, file);
  };

  const createCollection = <K extends keyof StoreData>(name: K): Collection<StoreData[K][number]> => ({
    all: () => (data[name] || []) as any,
    add(item: any) {
      if (!data[name]) data[name] = [] as any;
      (data[name] as any[]).unshift(item); // newest first
      save();
      return item;
    },
    update(id: string, changes: any) {
      if (!data[name]) return null;
      const item = (data[name] as any[]).find(x => x.id === id);
      if (!item) return null;
      Object.assign(item, changes);
      save();
      return item;
    },
    remove(id: string) {
      if (!data[name]) return false;
      const before = data[name].length;
      data[name] = (data[name] as any[]).filter(x => x.id !== id) as any;
      if (data[name].length === before) return false;
      save();
      return true;
    }
  });

  globalStoreInstance = {
    file,
    reviews: createCollection('reviews') as Collection<Review>,
    bookings: createCollection('bookings') as Collection<Booking>,
    blocks: createCollection('blocks') as Collection<RoomBlock>,
    reservations: createCollection('reservations') as Collection<FrontDeskReservation>
  };

  return globalStoreInstance;
}

export const getStore = (): StoreInstance => openStore();
