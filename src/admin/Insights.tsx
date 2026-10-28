import React, { useMemo, useState } from 'react';
import { venues, rupees } from '../data/venues';
import { api } from '../lib/api';
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

  // Filter reservations
  const filtered = useMemo(() => {
    return reservations.filter(r => {
      if (filterPlace !== 'all' && r.place !== filterPlace) return false;
      if (filterChannel !== 'all' && r.bookingChannel !== filterChannel) return false;
      if (filterPayment !== 'all' && r.paymentMode !== filterPayment) return false;
      return true;
    });
  }, [reservations, filterPlace, filterChannel, filterPayment]);

  // Aggregate metrics
  const totals = useMemo(() => {
    const totalRevenue = reservations.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cashTotal = reservations.filter(r => r.paymentMode === 'cash').reduce((s, r) => s + (Number(r.total) || 0), 0);
    const gpayTotal = reservations.filter(r => r.paymentMode === 'gpay').reduce((s, r) => s + (Number(r.total) || 0), 0);
    const cardTotal = reservations.filter(r => r.paymentMode === 'card').reduce((s, r) => s + (Number(r.total) || 0), 0);

    const inPersonCount = reservations.filter(r => r.bookingChannel === 'in_person').length;
    const websiteCount = reservations.filter(r => r.bookingChannel === 'website').length;

    return {
      count: reservations.length,
      totalRevenue,
      cashTotal,
      gpayTotal,
      cardTotal,
      inPersonCount,
      websiteCount
    };
  }, [reservations]);

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Front Desk Insights <span className="adm-muted">({reservations.length})</span></h1>
      </div>
      <p className="adm-muted adm-lead">
        Confidential Front-Desk and Room Layout reservations log. Revenue and room allocations are tracked here for hotel management.
      </p>

      {/* Top Insights Stats */}
      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="adm-stat">
          <span className="adm-stat__label">Total Revenue</span>
          <span className="adm-stat__value" style={{ color: '#d4a64a' }}>{rupees(totals.totalRevenue)}</span>
          <span className="adm-muted">{totals.count} Front-Desk booking{totals.count === 1 ? '' : 's'}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Cash Collected</span>
          <span className="adm-stat__value" style={{ color: '#34a853' }}>{rupees(totals.cashTotal)}</span>
          <span className="adm-muted">Paid at desk</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">GPay UPI</span>
          <span className="adm-stat__value" style={{ color: '#1a73e8' }}>{rupees(totals.gpayTotal)}</span>
          <span className="adm-muted">Digital payments</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Card POS</span>
          <span className="adm-stat__value" style={{ color: '#9333ea' }}>{rupees(totals.cardTotal)}</span>
          <span className="adm-muted">Debit / Credit card</span>
        </div>
      </div>

      {/* Filters */}
      <div className="adm-filters">
        <select value={filterPlace} onChange={e => setFilterPlace(e.target.value)} aria-label="Filter place">
          <option value="all">All Places</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.booking}</option>)}
        </select>

        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} aria-label="Filter channel">
          <option value="all">All Channels (In Person & Website)</option>
          <option value="in_person">👤 In Person ({totals.inPersonCount})</option>
          <option value="website">🌐 Website ({totals.websiteCount})</option>
        </select>

        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} aria-label="Filter payment">
          <option value="all">All Payment Modes</option>
          <option value="cash">💵 Cash</option>
          <option value="gpay">📱 GPay</option>
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
                <th>Dates</th>
                <th>Channel</th>
                <th>Payment Mode</th>
                <th>Total Paid</th>
                <th>Booked At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>Room {r.roomNumber}</strong>
                    <div className="adm-muted">{r.roomName} · {r.floorName}</div>
                  </td>
                  <td><strong>{r.name}</strong></td>
                  <td><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                  <td>{day(r.arrival)} → {day(r.departure)} <span className="adm-muted">({r.nights}n)</span></td>
                  <td>
                    <span className="adm-pill" style={{
                      background: r.bookingChannel === 'in_person' ? 'rgba(52, 168, 83, 0.12)' : 'rgba(26, 115, 232, 0.12)',
                      color: r.bookingChannel === 'in_person' ? '#34a853' : '#1a73e8',
                      border: `1px solid ${r.bookingChannel === 'in_person' ? 'rgba(52, 168, 83, 0.3)' : 'rgba(26, 115, 232, 0.3)'}`
                    }}>
                      {r.bookingChannel === 'in_person' ? '👤 In person' : '🌐 Website'}
                    </span>
                  </td>
                  <td>
                    <span className="adm-pill" style={{
                      background: r.paymentMode === 'cash' ? 'rgba(52, 168, 83, 0.12)' : (r.paymentMode === 'gpay' ? 'rgba(26, 115, 232, 0.12)' : 'rgba(147, 51, 234, 0.12)'),
                      color: r.paymentMode === 'cash' ? '#34a853' : (r.paymentMode === 'gpay' ? '#1a73e8' : '#9333ea'),
                      border: `1px solid ${r.paymentMode === 'cash' ? '#34a853' : (r.paymentMode === 'gpay' ? '#1a73e8' : '#9333ea')}`
                    }}>
                      {r.paymentMode === 'cash' ? '💵 Cash' : (r.paymentMode === 'gpay' ? '📱 GPay' : '💳 Card')}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#d4a64a' }}>{rupees(r.total)}</strong>
                    <div className="adm-muted">GST 5%: {rupees(r.gst)}</div>
                  </td>
                  <td className="adm-muted">{stamp(r.created)}</td>
                  <td>
                    <button
                      className="adm-btn adm-btn--danger"
                      onClick={() => onDeleteReservation?.(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-empty">
          {reservations.length ? 'No reservations match your filters.' : 'No Front Desk reservations logged yet.'}
        </p>
      )}
    </>
  );
}
