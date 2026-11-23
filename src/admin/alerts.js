import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/*
  Live alerts for new website bookings while the admin panel is open.
  - Checks the server every 30 seconds (the server only returns this admin's own property)
  - Plays a chime, shows a pop-up in the panel and a desktop notification, and puts the count in the tab title
  - Sound can be turned off; the choice is remembered on this computer only
  Browsers only allow sound after someone has clicked on the page, so the first click anywhere unlocks it.
*/

export const POLL_MS = 30_000;
const SOUND_KEY = 'skr-admin-alert-sound';

const readSoundPref = () => {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
};
const saveSoundPref = on => {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* private window: just not remembered */ }
};

/* A soft three-note hotel-desk chime made in the browser, so there is no sound file to load */
let audio = null;
const audioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audio ||= new Ctx();
  return audio;
};

export function playChime() {
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const start = ctx.currentTime + 0.05;
  [[1318.5, 0], [1046.5, 0.18], [1568, 0.36]].forEach(([freq, at]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(0.35, start + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + at);
    osc.stop(start + at + 1.2);
  });
}

export function useBookingAlerts({ bookings, setBookings, onError, placeName }) {
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const [soundReady, setSoundReady] = useState(false); // has the browser let us play sound yet?
  const [toasts, setToasts] = useState([]); // new bookings shown as pop-ups
  const seen = useRef(null); // ids already known, so only truly new bookings alert

  // Everything already loaded (first load, Refresh, changes made here) counts as seen
  useEffect(() => {
    if (!bookings) return;
    seen.current ||= new Set();
    bookings.forEach(b => seen.current.add(b.id));
  }, [bookings]);

  // The first click or key press anywhere unlocks sound in this tab
  useEffect(() => {
    const unlock = () => {
      const ctx = audioContext();
      if (ctx?.state === 'suspended') ctx.resume();
      setSoundReady(true);
    };
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });
    return () => {
      removeEventListener('pointerdown', unlock);
      removeEventListener('keydown', unlock);
    };
  }, []);

  const alertFor = useCallback(fresh => {
    if (soundOn) playChime();
    setToasts(list => [...fresh.map(b => ({ ...b, toastAt: Date.now() })), ...list].slice(0, 5));

    // Desktop notification too, if staff allowed it (shows even when this tab is in the background)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      fresh.forEach(b => {
        const n = new Notification(`New booking — ${placeName(b.place)}`, {
          body: `${b.name} · ${b.roomName || 'Room'} · ${b.arrival} → ${b.departure}`,
          tag: b.id,
          icon: '/assets/logo-crest-sm.webp'
        });
        n.onclick = () => { window.focus(); n.close(); };
      });
    }
  }, [soundOn, placeName]);

  // Check for new bookings every 30 seconds (browsers may slow this to once a minute in a hidden tab)
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (!seen.current) return; // wait for the first load
      try {
        const list = await api('/admin/bookings');
        if (stopped) return;
        const fresh = list.filter(b => b.status === 'new' && !seen.current.has(b.id));
        list.forEach(b => seen.current.add(b.id));
        if (fresh.length) {
          setBookings(list);
          alertFor(fresh);
        }
      } catch (err) {
        if (err.status === 401) onError(err); // signed out: back to the sign-in screen
        // anything else (a network blip): try again next round
      }
    };
    const timer = setInterval(check, POLL_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [setBookings, alertFor, onError]);

  // Unread count in the tab title, e.g. "(2) Admin · SKR Sivabhagya", so it shows on a background tab
  useEffect(() => {
    const base = 'Admin · SKR Sivabhagya';
    document.title = toasts.length ? `(${toasts.length}) New booking · ${base}` : base;
  }, [toasts.length]);

  const toggleSound = async () => {
    const on = !soundOn;
    setSoundOn(on);
    saveSoundPref(on);
    if (on) {
      setSoundReady(true);
      playChime(); // a sample, so staff know what to listen for
      // Ask once for desktop notifications as well
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try { await Notification.requestPermission(); } catch { /* older browsers */ }
      }
    }
  };

  const dismiss = id => setToasts(list => list.filter(t => t.id !== id));
  const dismissAll = () => setToasts([]);

  return { soundOn, soundReady, toggleSound, toasts, dismiss, dismissAll };
}
