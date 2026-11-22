import React, { useMemo, useState } from 'react';
import { rupees } from '../data/venues';
import { useAdmin, useAdminVenues } from './scope';

const CHANNEL_LABEL: Record<string, string> = { website: 'Website', in_person: 'In person' };
const PAYMENT_LABEL: Record<string, string> = { cash: 'Cash', gpay: 'GPay', card: 'Card' };

/* One CSV cell: quoted, with quotes doubled. Values starting with = + - @ are prefixed so Excel
   never runs a guest-typed name as a formula. */
/* A value Excel must keep as text, e.g. a phone number (keeps leading 0 and +91) */
const asText = (v: unknown) => ({ text: String(v ?? '') });

const csvCell = (v: unknown) => {
  if (v && typeof v === 'object' && 'text' in v) {
    // ="…" makes Excel show the exact characters; the value sits inside a string, so it can't run as a formula
    return `"=""${String((v as { text: string }).text).replace(/"/g, '""""')}"""`;
  }
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/* Save text as a file in the browser (BOM first so Excel reads ₹ and Tamil names correctly) */
function downloadCsv(lines: unknown[][], filename: string) {
  const csv = '﻿' + lines.map(r => r.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
import type { FrontDeskReservation } from '../types';

interface InsightsProps {
  reservations: FrontDeskReservation[];
  bookings: any[];
  onDeleteReservation?: (id: string) => void;
}

const day = (iso: string) =>
  new Date(iso?.length === 10 ? `${iso}T00:00` : iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });

// Extract YYYY-MM-DD cleanly
const toYMD = (val: string) => {
  if (!val) return '';
  if (val.length === 10) return val;
  try {
    const d = new Date(val);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  } catch {
    return val.substring(0, 10);
  }
};

export default function Insights({ reservations = [], bookings = [], onDeleteReservation }: InsightsProps) {
  const venues = useAdminVenues();
  const { user } = useAdmin();
  const [filterPlace, setFilterPlace] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  // Optional Date Range Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateMode, setDateMode] = useState<'stay' | 'booked'>('stay');

  // Quick preset helper
  const applyPreset = (preset: 'today' | 'month' | 'all') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    if (preset === 'today') {
      const todayStr = `${y}-${m}-${d}`;
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = `${y}-${m}-01`;
      const lastDayNum = new Date(y, now.getMonth() + 1, 0).getDate();
      const lastDay = `${y}-${m}-${String(lastDayNum).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Floor index helper for room number calculation if missing on website bookings
  const floorIndexMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    terrace: 5,
    house: 1
  };

  // Convert website bookings into unified record format for Insights
  const unifiedList = useMemo(() => {
    // 1. Front Desk direct reservations
    const list: any[] = reservations.map(r => ({
      ...r,
      isFrontDesk: true
    }));

    // 2. Confirmed & new bookings from the public website
    bookings.forEach((b: any, index: number) => {
      const roomNum =
        b.roomNumber ||
        `${(floorIndexMap[b.floor] || 1) * 100 + ((index % 10) + 1)}`;
      const nights = Math.max(
        1,
        Math.round((Date.parse(b.departure) - Date.parse(b.arrival)) / 864e5) || 1
      );
      const estTotal = b.estimate?.total || 2500 * nights * (b.rooms || 1);
      const sub = Math.round(estTotal / 1.05);
      const gst = estTotal - sub;

      list.push({
        id: b.id,
        created: b.createdAt || new Date().toISOString(),
        place: b.place,
        floor: b.floor,
        floorName: b.floorName || b.floor,
        room: b.room,
        roomName: b.roomName || b.room,
        roomNumber: roomNum,
        bookingChannel: 'website',
        paymentMode: 'gpay', // default for online bookings
        name: b.name,
        phone: b.phone,
        arrival: b.arrival,
        departure: b.departure,
        nights,
        ratePerNight: Math.round(sub / nights),
        subtotal: sub,
        gst,
        total: estTotal,
        isFrontDesk: false,
        status: b.status
      });
    });

    // Sort newest first
    return list.sort((a, b) => b.created.localeCompare(a.created));
  }, [reservations, bookings]);

  // Filter list by place, channel, payment, and optional date range
  const filtered = useMemo(() => {
    return unifiedList.filter(r => {
      if (filterPlace !== 'all' && r.place !== filterPlace) return false;
      if (filterChannel !== 'all' && r.bookingChannel !== filterChannel) return false;
      if (filterPayment !== 'all' && r.paymentMode !== filterPayment) return false;

      // Optional date range filtering
      if (startDate || endDate) {
        if (dateMode === 'stay') {
          const arr = toYMD(r.arrival);
          const dep = toYMD(r.departure);
          if (startDate && dep < startDate) return false;
          if (endDate && arr > endDate) return false;
        } else {
          const booked = toYMD(r.created);
          if (startDate && booked < startDate) return false;
          if (endDate && booked > endDate) return false;
        }
      }

      return true;
    });
  }, [unifiedList, filterPlace, filterChannel, filterPayment, startDate, endDate, dateMode]);

  // Aggregate metrics (reflects current filters / date range)
  const totals = useMemo(() => {
    const totalRevenue = filtered.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cashTotal = filtered
      .filter(r => r.paymentMode === 'cash')
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const gpayTotal = filtered
      .filter(r => r.paymentMode === 'gpay')
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cardTotal = filtered
      .filter(r => r.paymentMode === 'card')
      .reduce((s, r) => s + (Number(r.total) || 0), 0);

    const inPersonCount = filtered.filter(r => r.bookingChannel === 'in_person').length;
    const websiteCount = filtered.filter(r => r.bookingChannel === 'website').length;

    return {
      count: filtered.length,
      totalRevenue,
      cashTotal,
      gpayTotal,
      cardTotal,
      inPersonCount,
      websiteCount
    };
  }, [filtered]);

  /*
    Report of exactly what is on screen (same place, channel, payment and date filters).
    The server only sends a property admin their own property's records, so their report can't hold anyone else's.
  */
  const downloadReport = () => {
    const placeLabel = (id: string) => venues.find(v => v.id === id)?.booking ?? id;
    const scope = filterPlace !== 'all' ? placeLabel(filterPlace) : venues.length === 1 ? venues[0].booking : 'All properties';
    const range = startDate || endDate
      ? `${startDate ? day(startDate) : 'start'} to ${endDate ? day(endDate) : 'today'} (by ${dateMode === 'stay' ? 'stay dates' : 'booking date'})`
      : 'All dates';
    const today = new Date();
    const ymd = toYMD(today.toISOString());

    const lines: unknown[][] = [
      ['SKR Sivabhagya — Insights report'],
      ['Property', scope],
      ['Dates', range],
      ['Channel', filterChannel === 'all' ? 'All' : CHANNEL_LABEL[filterChannel] ?? filterChannel],
      ['Payment', filterPayment === 'all' ? 'All' : PAYMENT_LABEL[filterPayment] ?? filterPayment],
      ['Generated', `${today.toLocaleString('en-IN')} by ${user?.username ?? 'admin'}`],
      [],
      ['Summary'],
      ['Reservations', totals.count],
      ['In person', totals.inPersonCount],
      ['Website', totals.websiteCount],
      ['Total revenue (₹)', totals.totalRevenue],
      ['Cash (₹)', totals.cashTotal],
      ['GPay (₹)', totals.gpayTotal],
      ['Card (₹)', totals.cardTotal],
      [],
      ['Booked on', 'Guest', 'Phone', 'Property', 'Floor', 'Room type', 'Room no.', 'Arrival', 'Departure', 'Nights',
        'Channel', 'Payment', 'Status', 'Rate / night (₹)', 'Subtotal (₹)', 'GST (₹)', 'Total (₹)'],
      ...filtered.map(r => [
        toYMD(r.created), r.name, asText(r.phone), placeLabel(r.place), r.floorName, r.roomName, r.roomNumber,
        r.arrival, r.departure, r.nights,
        CHANNEL_LABEL[r.bookingChannel] ?? r.bookingChannel, PAYMENT_LABEL[r.paymentMode] ?? r.paymentMode,
        r.isFrontDesk ? 'Front desk' : r.status ?? '',
        r.ratePerNight, r.subtotal, r.gst, r.total
      ])
    ];

    const slug = scope.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const datePart = startDate || endDate ? `${startDate || 'start'}_to_${endDate || ymd}` : ymd;
    downloadCsv(lines, `skr-report_${slug}_${datePart}.csv`);
  };

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">
          Hospitality Insights <span className="adm-muted">({filtered.length} of {unifiedList.length})</span>
        </h1>
        <button
          className="adm-btn"
          onClick={downloadReport}
          disabled={!filtered.length}
          title="Download the reservations shown below, with their totals, as a spreadsheet (CSV)"
        >
          Download report
        </button>
      </div>
      <p className="adm-muted adm-lead">
        Unified overview of bookings from the <b>Website (GPay)</b> and <b>In Person Front-Desk</b> reservations with full payment &amp; revenue breakdown.
      </p>

      {/* Top Insights Stats */}
      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="adm-stat">
          <span className="adm-stat__label">Total Revenue</span>
          <span className="adm-stat__value" style={{ color: '#d4a64a' }}>
            {rupees(totals.totalRevenue)}
          </span>
          <span className="adm-muted">{totals.count} Reservation{totals.count === 1 ? '' : 's'}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">GPay UPI (Website &amp; Desk)</span>
          <span className="adm-stat__value" style={{ color: '#1a73e8' }}>
            {rupees(totals.gpayTotal)}
          </span>
          <span className="adm-muted">Online &amp; GPay UPI</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Cash Collected</span>
          <span className="adm-stat__value" style={{ color: '#34a853' }}>
            {rupees(totals.cashTotal)}
          </span>
          <span className="adm-muted">Paid at front desk</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Card POS</span>
          <span className="adm-stat__value" style={{ color: '#9333ea' }}>
            {rupees(totals.cardTotal)}
          </span>
          <span className="adm-muted">Debit / Credit card</span>
        </div>
      </div>

      {/* Primary Filters (Place, Channel, Payment) */}
      <div className="adm-filters" style={{ marginBottom: '12px' }}>
        <select value={filterPlace} onChange={e => setFilterPlace(e.target.value)} aria-label="Filter place">
          <option value="all">All Places</option>
          {venues.map(v => (
            <option key={v.id} value={v.id}>
              {v.booking}
            </option>
          ))}
        </select>

        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} aria-label="Filter channel">
          <option value="all">All Channels (Website &amp; In-Person)</option>
          <option value="website">🌐 Website ({unifiedList.filter(x => x.bookingChannel === 'website').length})</option>
          <option value="in_person">👤 In Person ({unifiedList.filter(x => x.bookingChannel === 'in_person').length})</option>
        </select>

        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} aria-label="Filter payment">
          <option value="all">All Payment Modes</option>
          <option value="gpay">📱 GPay</option>
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
        </select>
      </div>

      {/* Optional Date Range Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '12px 16px',
          background: 'rgba(212, 166, 74, 0.05)',
          border: '1px solid rgba(212, 166, 74, 0.2)',
          borderRadius: '8px',
          marginBottom: '20px'
        }}
      >
        <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>
          Date Range (Optional):
        </span>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
          <span>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid var(--line)',
              color: 'var(--ivory)',
              colorScheme: 'dark'
            }}
          />
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
          <span>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid var(--line)',
              color: 'var(--ivory)',
              colorScheme: 'dark'
            }}
          />
        </label>

        <select
          value={dateMode}
          onChange={e => setDateMode(e.target.value as 'stay' | 'booked')}
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid var(--line)',
            color: 'var(--ivory)'
          }}
          aria-label="Date filter type"
        >
          <option value="stay">Filter by Stay Dates</option>
          <option value="booked">Filter by Booked Date</option>
        </select>

        {/* Quick Presets */}
        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
          <button
            type="button"
            className="adm-btn"
            onClick={() => applyPreset('today')}
            style={{ padding: '4px 10px', fontSize: '11px', textTransform: 'uppercase' }}
          >
            Today
          </button>
          <button
            type="button"
            className="adm-btn"
            onClick={() => applyPreset('month')}
            style={{ padding: '4px 10px', fontSize: '11px', textTransform: 'uppercase' }}
          >
            This Month
          </button>
          {(startDate || endDate) && (
            <button
              type="button"
              className="adm-btn"
              onClick={() => applyPreset('all')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                textTransform: 'uppercase',
                borderColor: 'rgba(212, 166, 74, 0.45)',
                color: 'var(--gold)'
              }}
            >
              Clear Dates ✕
            </button>
          )}
        </div>
      </div>

      {/* Reservations Table */}
      {filtered.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Guest</th>
                <th>Phone</th>
                <th>Stay Dates</th>
                <th>Source Channel</th>
                <th>Payment Mode</th>
                <th>Total (with GST)</th>
                <th>Booked At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>Room {r.roomNumber}</strong>
                    <div className="adm-muted">
                      {r.roomName} · {r.floorName}
                    </div>
                  </td>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td>
                    <a href={`tel:${r.phone}`}>{r.phone}</a>
                  </td>
                  <td>
                    {day(r.arrival)} → {day(r.departure)}{' '}
                    <span className="adm-muted">({r.nights}n)</span>
                  </td>
                  <td>
                    <span
                      className="adm-pill"
                      style={{
                        background:
                          r.bookingChannel === 'in_person'
                            ? 'rgba(52, 168, 83, 0.12)'
                            : 'rgba(26, 115, 232, 0.12)',
                        color: r.bookingChannel === 'in_person' ? '#34a853' : '#1a73e8',
                        border: `1px solid ${
                          r.bookingChannel === 'in_person'
                            ? 'rgba(52, 168, 83, 0.3)'
                            : 'rgba(26, 115, 232, 0.3)'
                        }`
                      }}
                    >
                      {r.bookingChannel === 'in_person' ? '👤 In person' : '🌐 Website'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="adm-pill"
                      style={{
                        background:
                          r.paymentMode === 'cash'
                            ? 'rgba(52, 168, 83, 0.12)'
                            : r.paymentMode === 'gpay'
                            ? 'rgba(26, 115, 232, 0.12)'
                            : 'rgba(147, 51, 234, 0.12)',
                        color:
                          r.paymentMode === 'cash'
                            ? '#34a853'
                            : r.paymentMode === 'gpay'
                            ? '#1a73e8'
                            : '#9333ea',
                        border: `1px solid ${
                          r.paymentMode === 'cash'
                            ? '#34a853'
                            : r.paymentMode === 'gpay'
                            ? '#1a73e8'
                            : '#9333ea'
                        }`
                      }}
                    >
                      {r.paymentMode === 'cash'
                        ? '💵 Cash'
                        : r.paymentMode === 'gpay'
                        ? '📱 GPay'
                        : '💳 Card'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#d4a64a' }}>{rupees(r.total)}</strong>
                    <div className="adm-muted">GST 5%: {rupees(r.gst)}</div>
                  </td>
                  <td className="adm-muted">{stamp(r.created)}</td>
                  <td>
                    {r.isFrontDesk ? (
                      <button
                        className="adm-btn adm-btn--danger"
                        onClick={() => onDeleteReservation?.(r.id)}
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="adm-muted" style={{ fontSize: '11px' }}>
                        From Website
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-empty">No bookings found matching your filters.</p>
      )}
    </>
  );
}
