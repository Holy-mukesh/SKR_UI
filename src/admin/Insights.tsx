import React, { useMemo, useState } from 'react';
import { venues, rupees } from '../data/venues';
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

export default function Insights({ reservations = [], bookings = [], onDeleteReservation }: InsightsProps) {
  const [filterPlace, setFilterPlace] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

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

  // Filter list
  const filtered = useMemo(() => {
    return unifiedList.filter(r => {
      if (filterPlace !== 'all' && r.place !== filterPlace) return false;
      if (filterChannel !== 'all' && r.bookingChannel !== filterChannel) return false;
      if (filterPayment !== 'all' && r.paymentMode !== filterPayment) return false;
      return true;
    });
  }, [unifiedList, filterPlace, filterChannel, filterPayment]);

  // Aggregate metrics
  const totals = useMemo(() => {
    const totalRevenue = unifiedList.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cashTotal = unifiedList
      .filter(r => r.paymentMode === 'cash')
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const gpayTotal = unifiedList
      .filter(r => r.paymentMode === 'gpay')
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cardTotal = unifiedList
      .filter(r => r.paymentMode === 'card')
      .reduce((s, r) => s + (Number(r.total) || 0), 0);

    const inPersonCount = unifiedList.filter(r => r.bookingChannel === 'in_person').length;
    const websiteCount = unifiedList.filter(r => r.bookingChannel === 'website').length;

    return {
      count: unifiedList.length,
      totalRevenue,
      cashTotal,
      gpayTotal,
      cardTotal,
      inPersonCount,
      websiteCount
    };
  }, [unifiedList]);

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">
          Hospitality Insights <span className="adm-muted">({unifiedList.length})</span>
        </h1>
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
          <span className="adm-muted">{totals.count} Total Reservation{totals.count === 1 ? '' : 's'}</span>
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

      {/* Filters */}
      <div className="adm-filters">
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
          <option value="website">🌐 Website ({totals.websiteCount})</option>
          <option value="in_person">👤 In Person ({totals.inPersonCount})</option>
        </select>

        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} aria-label="Filter payment">
          <option value="all">All Payment Modes</option>
          <option value="gpay">📱 GPay</option>
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
        </select>
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
