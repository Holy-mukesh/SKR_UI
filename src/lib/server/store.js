import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/*
  Atomic JSON file database: { reviews: [], bookings: [], blocks: [] }.
  State is maintained and saved atomically to disk.
*/
let globalStoreInstance = null;

export function openStore(dir = process.env.DATA_DIR || 'data') {
  if (globalStoreInstance) return globalStoreInstance;

  const dataDir = join(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, 'db.json');

  let data = { reviews: [], bookings: [], blocks: [] };
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    data = {
      reviews: Array.isArray(saved.reviews) ? saved.reviews : [],
      bookings: Array.isArray(saved.bookings) ? saved.bookings : [],
      blocks: Array.isArray(saved.blocks) ? saved.blocks : []
    };
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Could not read ${file}: ${err.message}`);
  }

  const save = () => {
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, file);
  };

  const collection = name => ({
    all: () => data[name],
    add(item) {
      data[name].unshift(item); // newest first
      save();
      return item;
    },
    update(id, changes) {
      const item = data[name].find(x => x.id === id);
      if (!item) return null;
      Object.assign(item, changes);
      save();
      return item;
    },
    remove(id) {
      const before = data[name].length;
      data[name] = data[name].filter(x => x.id !== id);
      if (data[name].length === before) return false;
      save();
      return true;
    }
  });

  globalStoreInstance = {
    file,
    reviews: collection('reviews'),
    bookings: collection('bookings'),
    blocks: collection('blocks')
  };

  return globalStoreInstance;
}

export const getStore = () => openStore();
