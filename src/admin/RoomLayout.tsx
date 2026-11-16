import React, { useMemo, useState } from 'react';
import { venues, rupees } from '../data/venues';
import { addDays, nightsBetween } from '../lib/stay';
import type { FrontDeskReservation } from '../types';
import './room-layout.css';

interface RoomLayoutProps {
  bookings: any[];
  blocks: any[];
  reservations?: FrontDeskReservation[];
  onBookSuccess?: () => void;
  onError?: (err: any) => void;
}

export default function RoomLayout({
  bookings = [],
  blocks = [],
  reservations = [],
  onBookSuccess,
  onError
}: RoomLayoutProps) {
  // Selected place (defaults to Aarapalayam hotel from reference image)
  const [placeId, setPlaceId] = useState('arapalayam');

  // Selected Date (defaults to today)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const venue = useMemo(() => venues.find(v => v.id === placeId) || venues[0], [placeId]);

  // Selected floor (defaults to second floor)
  const [floorId, setFloorId] = useState<string>('second');

  // Currently selected room number (null/empty initially so all rooms show in available color)
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');

  // Booking Form State for Front Desk walk-in
  const [bookingChannel, setBookingChannel] = useState<'in_person' | 'website'>('in_person');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'gpay' | 'card'>('cash');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(addDays(todayStr, 2));
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Find floor details
  const currentFloor = useMemo(() => {
    return (
      venue.inventory?.find(f => f.id === floorId) ||
      venue.inventory?.[0] || { id: 'first', name: 'First floor', rooms: {} }
    );
  }, [venue, floorId]);

  // Find room type and price for this floor
  const currentRoomType = useMemo(() => {
    const firstRoomKey = Object.keys(currentFloor.rooms)[0];
    return venue.rooms.find(r => r.id === firstRoomKey) || venue.rooms[0];
  }, [venue, currentFloor]);

  // Generate Room Numbers for this floor (e.g. floor 'second' -> 201..210)
  const floorIndexMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    terrace: 5,
    house: 1
  };
  const prefix = (floorIndexMap[floorId] || 1) * 100;

  const totalRoomsOnFloor = useMemo(() => {
    return (
      Object.values(currentFloor.rooms).reduce((sum: number, c: any) => sum + Number(c || 0), 0) || 10
    );
  }, [currentFloor]);

  // Map each room to its status on selectedDate
  const roomsList = useMemo(() => {
    // Check FrontDesk reservations for this place, floor and date
    const activeFrontDesk = reservations.filter(
      r =>
        r.place === placeId &&
        r.floor === floorId &&
        selectedDate >= r.arrival &&
        selectedDate < r.departure
    );

    // Check all active website bookings (new or confirmed, not cancelled)
    const activeWebsiteStays = bookings.filter(
      b =>
        b.place === placeId &&
        b.status !== 'cancelled' &&
        b.floor === floorId &&
        selectedDate >= b.arrival &&
        selectedDate < b.departure
    );

    // Check maintenance blocks
    const activeBlocks = blocks.filter(
      k =>
        k.place === placeId &&
        k.floor === floorId &&
        selectedDate >= k.arrival &&
        selectedDate < k.departure
    );

    return Array.from({ length: totalRoomsOnFloor }, (_, i) => {
      const roomNum = `${prefix + i + 1}`;

      // 1. Check if there is a front-desk reservation matching this room number
      const fdRes = activeFrontDesk.find(r => r.roomNumber === roomNum);
      if (fdRes) {
        return {
          number: roomNum,
          status: 'booked',
          paymentMode: fdRes.paymentMode, // 'cash' (green) | 'gpay' (blue) | 'card' (purple)
          bookingChannel: fdRes.bookingChannel, // 'in_person' | 'website'
          sourceText: `${fdRes.paymentMode.toUpperCase()} · ${fdRes.bookingChannel === 'in_person' ? 'IN PERSON' : 'WEBSITE'}`,
          guestName: fdRes.name
        };
      }

      // 2. Check if there is a public website booking for this slot or matching room
      const webBooking = activeWebsiteStays.find(b => b.roomNumber === roomNum) || activeWebsiteStays[i];
      if (webBooking) {
        return {
          number: roomNum,
          status: 'booked',
          paymentMode: 'gpay', // User requested: website bookings reflect as Website and GPay (Blue)
          bookingChannel: 'website' as const,
          sourceText: 'GPAY · WEBSITE',
          guestName: webBooking.name
        };
      }

      // 3. Check if under maintenance block
      if (activeBlocks[i]) {
        return {
          number: roomNum,
          status: 'maintenance' as const,
          paymentMode: null,
          bookingChannel: null,
          sourceText: activeBlocks[i].reason || 'MAINTENANCE',
          guestName: ''
        };
      }

      // Default: Available
      return {
        number: roomNum,
        status: 'available' as const,
        paymentMode: null,
        bookingChannel: null,
        sourceText: 'AVAILABLE',
        guestName: ''
      };
    });
  }, [prefix, totalRoomsOnFloor, reservations, bookings, blocks, placeId, floorId, selectedDate]);

  // Top metric numbers
  const metrics = useMemo(() => {
    const totalVenueRooms =
      (venue.inventory || []).reduce((acc: number, f: any) => {
        const counts = Object.values(f.rooms || {}) as number[];
        const floorCount = counts.reduce((sum: number, c: number) => sum + (Number(c) || 0), 0);
        return acc + floorCount;
      }, 0) || 40;

    // Active front desk reservations
    const activeFrontDesk = reservations.filter(
      r => r.place === placeId && selectedDate >= r.arrival && selectedDate < r.departure
    );

    // Active confirmed bookings
    const confirmedStays = bookings.filter(
      b =>
        b.place === placeId &&
        b.status === 'confirmed' &&
        selectedDate >= b.arrival &&
        selectedDate < b.departure
    );

    // Active maintenance blocks
    const maintenanceBlocks = blocks.filter(
      k => k.place === placeId && selectedDate >= k.arrival && selectedDate < k.departure
    );

    const inPersonCount = activeFrontDesk.filter(r => r.bookingChannel === 'in_person').length;
    const websiteCount =
      activeFrontDesk.filter(r => r.bookingChannel === 'website').length + confirmedStays.length;
    const maintCount = maintenanceBlocks.length;
    const takenCount = activeFrontDesk.length + confirmedStays.length + maintCount;
    const availableCount = Math.max(0, totalVenueRooms - takenCount);

    return {
      total: totalVenueRooms,
      available: availableCount,
      inPerson: inPersonCount,
      website: websiteCount,
      maintenance: maintCount
    };
  }, [venue, reservations, bookings, blocks, placeId, selectedDate]);

  // Pricing calculations
  const nights = Math.max(1, nightsBetween(checkIn, checkOut));
  const ratePerNight = currentRoomType?.price || 2500;
  const subtotal = ratePerNight * nights;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  // Floor free counts
  const getFloorFreeCount = (fId: string) => {
    const floorObj = venue.inventory?.find(f => f.id === fId);
    if (!floorObj) return 0;
    const counts = Object.values(floorObj.rooms || {}) as number[];
    const floorTotal = counts.reduce((s: number, c: number) => s + (Number(c) || 0), 0);
    const taken =
      reservations.filter(
        r => r.place === placeId && r.floor === fId && selectedDate >= r.arrival && selectedDate < r.departure
      ).length +
      bookings.filter(
        b =>
          b.place === placeId &&
          b.status !== 'cancelled' &&
          b.floor === fId &&
          selectedDate >= b.arrival &&
          selectedDate < b.departure
      ).length +
      blocks.filter(
        k => k.place === placeId && k.floor === fId && selectedDate >= k.arrival && selectedDate < k.departure
      ).length;
    return Math.max(0, floorTotal - taken);
  };

  // Submit Front Desk reservation directly to Insights (/api/admin/reservations)
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomNumber) {
      alert('Please tap a room on the floor layout to select it.');
      return;
    }
    if (!guestName.trim()) {
      alert('Please enter guest name.');
      return;
    }
    setSubmitting(true);
    setFeedbackMsg('');

    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place: placeId,
          floor: floorId,
          floorName: currentFloor.name,
          room: currentRoomType.id,
          roomName: currentRoomType.name,
          roomNumber: selectedRoomNumber,
          bookingChannel,
          paymentMode,
          name: guestName,
          phone: guestPhone || '0000000000',
          arrival: checkIn,
          departure: checkOut,
          nights,
          ratePerNight,
          subtotal,
          gst,
          total
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reservation failed');

      setFeedbackMsg(`✓ Room ${selectedRoomNumber} reserved! Logged in Insights.`);
      setGuestName('');
      setGuestPhone('');
      setSelectedRoomNumber('');
      onBookSuccess?.();
    } catch (err: any) {
      alert(err.message);
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rl-wrap">
      {/* 1. Header with Eyebrow, Location dropdown & Date Picker */}
      <div className="rl-head">
        <div>
          <div className="rl-head__eyebrow">Front Desk Operations</div>
          <h1 className="rl-head__title">
            Room layout <span>· {venue.booking}</span>
          </h1>
        </div>

        <div className="rl-selectors">
          <div className="rl-select-box">
            <label>Place</label>
            <select
              value={placeId}
              onChange={e => {
                setPlaceId(e.target.value);
                setFloorId('first');
                setSelectedRoomNumber('');
              }}
            >
              {venues.map(v => (
                <option key={v.id} value={v.id}>
                  {v.booking}
                </option>
              ))}
            </select>
          </div>

          <div className="rl-select-box">
            <label>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                setCheckIn(e.target.value);
                setCheckOut(addDays(e.target.value, 2));
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Top Metrics Row */}
      <div className="rl-metrics">
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">Rooms Tonight</span>
          <span className="rl-metric-card__val">{metrics.total}</span>
        </div>
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">Available</span>
          <span className="rl-metric-card__val" style={{ color: '#8f6516' }}>
            {metrics.available}
          </span>
        </div>
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">In Person</span>
          <span className="rl-metric-card__val" style={{ color: '#34a853' }}>
            {metrics.inPerson}
          </span>
        </div>
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">Website</span>
          <span className="rl-metric-card__val" style={{ color: '#1a73e8' }}>
            {metrics.website}
          </span>
        </div>
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">Under Maintenance</span>
          <span className="rl-metric-card__val" style={{ color: '#8a8279' }}>
            {metrics.maintenance}
          </span>
        </div>
      </div>

      {/* 3. Main Split Area: Floor Plan + Quick Walk-In Panel */}
      <div className="rl-main-split">
        {/* LEFT COLUMN: Floor Navigation + Floor Grid */}
        <div>
          {/* Floor Info & Floor Buttons */}
          <div className="rl-floor-nav">
            <div className="rl-floor-info">
              <h2>{currentFloor.name}</h2>
              <span>
                · {currentRoomType.name} · {rupees(ratePerNight)} a night
              </span>
            </div>

            <div className="rl-floor-pills">
              {venue.inventory?.map((f: any) => (
                <button
                  type="button"
                  key={f.id}
                  className={`rl-floor-pill${floorId === f.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setFloorId(f.id);
                    setSelectedRoomNumber('');
                  }}
                >
                  {f.name.split(' ')[0]} <small>{getFloorFreeCount(f.id)} free</small>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Floor Canvas */}
          <div className="rl-canvas">
            {/* Left elevator / stairs vertical strip */}
            <div className="rl-canvas__elevator">
              <div className="rl-canvas__elevator-icon">⇅</div>
              <span>Lift · Stairs</span>
            </div>

            {/* Hallway with top and bottom rows */}
            <div className="rl-hallway">
              {/* Row 1: Rooms (First half) */}
              <div className="rl-rooms-row">
                {roomsList.slice(0, Math.ceil(roomsList.length / 2)).map(room => {
                  const isSelected = selectedRoomNumber === room.number;
                  let cardClass = 'rl-room';
                  if (isSelected) {
                    cardClass += ' rl-room--selected';
                  } else if (room.status === 'booked' && room.paymentMode) {
                    cardClass += ` rl-room--${room.paymentMode}`; // cash | gpay | card
                  } else if (room.status === 'maintenance') {
                    cardClass += ' rl-room--maintenance';
                  } else {
                    cardClass += ' rl-room--available';
                  }

                  return (
                    <div
                      key={room.number}
                      className={cardClass}
                      onClick={() => setSelectedRoomNumber(room.number)}
                    >
                      <div className="rl-room__slot" />
                      <div className="rl-room__top">
                        <span className="rl-room__number">{room.number}</span>
                        {room.bookingChannel === 'website' && <span className="rl-room__badge">🌐</span>}
                        {room.bookingChannel === 'in_person' && <span className="rl-room__badge">👤</span>}
                      </div>

                      <div className="rl-room__status-text">
                        {isSelected ? 'SELECTED' : room.sourceText}
                      </div>

                      {room.guestName && !isSelected && (
                        <div style={{ fontSize: '11px', color: '#1a1816', fontWeight: 600, marginTop: '2px' }}>
                          {room.guestName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Corridor Middle Divider */}
              <div className="rl-corridor">Corridor</div>

              {/* Row 2: Rooms (Second half) */}
              <div className="rl-rooms-row">
                {roomsList.slice(Math.ceil(roomsList.length / 2)).map(room => {
                  const isSelected = selectedRoomNumber === room.number;
                  let cardClass = 'rl-room';
                  if (isSelected) {
                    cardClass += ' rl-room--selected';
                  } else if (room.status === 'booked' && room.paymentMode) {
                    cardClass += ` rl-room--${room.paymentMode}`; // cash | gpay | card
                  } else if (room.status === 'maintenance') {
                    cardClass += ' rl-room--maintenance';
                  } else {
                    cardClass += ' rl-room--available';
                  }

                  return (
                    <div
                      key={room.number}
                      className={cardClass}
                      onClick={() => setSelectedRoomNumber(room.number)}
                    >
                      <div className="rl-room__slot" />
                      <div className="rl-room__top">
                        <span className="rl-room__number">{room.number}</span>
                        {room.bookingChannel === 'website' && <span className="rl-room__badge">🌐</span>}
                        {room.bookingChannel === 'in_person' && <span className="rl-room__badge">👤</span>}
                      </div>

                      <div className="rl-room__status-text">
                        {isSelected ? 'SELECTED' : room.sourceText}
                      </div>

                      {room.guestName && !isSelected && (
                        <div style={{ fontSize: '11px', color: '#1a1816', fontWeight: 600, marginTop: '2px' }}>
                          {room.guestName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


        </div>

        {/* RIGHT COLUMN: Walk-In / Front Desk Booking Sidebar */}
        <form className="rl-panel" onSubmit={handleConfirmBooking}>
          <div className="rl-panel__eyebrow">Front Desk Reservation</div>

          <div className="rl-panel__room-head">
            <div>
              <h3 className="rl-panel__room-num">
                {selectedRoomNumber ? `Room ${selectedRoomNumber}` : 'Select a room'}
              </h3>
              <span className="rl-panel__room-sub">
                {currentRoomType.name} · {currentFloor.name}
              </span>
            </div>
            <span className="rl-panel__rate">{rupees(ratePerNight)} / night</span>
          </div>

          {/* Step 2: How was it booked? (In person vs Website) */}
          <div className="rl-step">
            <div className="rl-step__title">
              <span className="rl-step__num">2</span> How was it booked?
            </div>
            <div className="rl-btn-grid">
              <button
                type="button"
                className={`rl-choice-btn${bookingChannel === 'in_person' ? ' is-active' : ''}`}
                onClick={() => setBookingChannel('in_person')}
              >
                <span>👤 In person</span>
              </button>
              <button
                type="button"
                className={`rl-choice-btn${bookingChannel === 'website' ? ' is-active' : ''}`}
                onClick={() => setBookingChannel('website')}
              >
                <span>🌐 Website</span>
              </button>
            </div>
          </div>

          {/* Step 3: Mode of Payment (Cash: Green, GPay: Blue, Card: Purple) */}
          <div className="rl-step">
            <div className="rl-step__title">
              <span className="rl-step__num">3</span> Mode of payment
            </div>
            <div className="rl-btn-grid rl-btn-grid--3">
              <button
                type="button"
                className={`rl-choice-btn${paymentMode === 'cash' ? ' is-active' : ''}`}
                style={paymentMode === 'cash' ? { borderColor: '#34a853', color: '#1e7e34' } : undefined}
                onClick={() => setPaymentMode('cash')}
              >
                <span>💵 Cash</span>
              </button>
              <button
                type="button"
                className={`rl-choice-btn${paymentMode === 'gpay' ? ' is-active' : ''}`}
                style={paymentMode === 'gpay' ? { borderColor: '#1a73e8', color: '#1557b0' } : undefined}
                onClick={() => setPaymentMode('gpay')}
              >
                <span>📱 GPay</span>
              </button>
              <button
                type="button"
                className={`rl-choice-btn${paymentMode === 'card' ? ' is-active' : ''}`}
                style={paymentMode === 'card' ? { borderColor: '#9333ea', color: '#6b21a8' } : undefined}
                onClick={() => setPaymentMode('card')}
              >
                <span>💳 Card</span>
              </button>
            </div>
          </div>

          {/* Step 4: Guest Details */}
          <div className="rl-step">
            <div className="rl-step__title">
              <span className="rl-step__num">4</span> Guest Information
            </div>
            <div className="rl-form-row">
              <div className="rl-input-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh K."
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  required
                />
              </div>
              <div className="rl-input-group">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="98400 12345"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="rl-form-row" style={{ marginTop: '6px' }}>
              <div className="rl-input-group">
                <label>Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  required
                />
              </div>
              <div className="rl-input-group">
                <label>Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="rl-pricing">
            <div className="rl-pricing__row">
              <span>
                {rupees(ratePerNight)} × {nights} night{nights > 1 ? 's' : ''}
              </span>
              <span>{rupees(subtotal)}</span>
            </div>
            <div className="rl-pricing__row">
              <span>GST 5%</span>
              <span>{rupees(gst)}</span>
            </div>
            <div className="rl-pricing__total">
              <span>Total</span>
              <span>{rupees(total)}</span>
            </div>
          </div>

          {feedbackMsg && (
            <div style={{ color: '#188038', fontSize: '13px', fontWeight: 600 }}>{feedbackMsg}</div>
          )}

          <button
            type="submit"
            className="rl-confirm-btn"
            disabled={submitting || !selectedRoomNumber}
          >
            {submitting
              ? 'Saving to Insights…'
              : selectedRoomNumber
              ? `Confirm & Save to Insights · Room ${selectedRoomNumber}`
              : 'Tap a room to book'}
          </button>
        </form>
      </div>
    </div>
  );
}
