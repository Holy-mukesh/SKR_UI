import React, { useMemo, useState } from 'react';
import { venues, rupees } from '../data/venues';
import { addDays, nightsBetween, quote } from '../lib/stay';
import './room-layout.css';

interface RoomLayoutProps {
  bookings: any[];
  blocks: any[];
  onBookSuccess?: () => void;
  onError?: (err: any) => void;
}

export default function RoomLayout({ bookings = [], blocks = [], onBookSuccess, onError }: RoomLayoutProps) {
  // Selected place (defaults to Aarapalayam hotel from reference image)
  const [placeId, setPlaceId] = useState('arapalayam');
  
  // Selected Date (defaults to today)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const venue = useMemo(() => venues.find(v => v.id === placeId) || venues[0], [placeId]);

  // Selected floor (defaults to second floor like the reference image)
  const [floorId, setFloorId] = useState<string>('second');

  // Currently selected room number (e.g. 204)
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('204');

  // Booking Form State for Front Desk walk-in
  const [bookingChannel, setBookingChannel] = useState<'in_person' | 'website'>('in_person');
  const [paymentMode, setPaymentMode] = useState<'gpay' | 'cash' | 'card'>('gpay');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(addDays(todayStr, 2));
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Find floor details
  const currentFloor = useMemo(() => {
    return venue.inventory?.find(f => f.id === floorId) || venue.inventory?.[0] || { id: 'first', name: 'First floor', rooms: {} };
  }, [venue, floorId]);

  // Find room type and price for this floor
  const currentRoomType = useMemo(() => {
    const firstRoomKey = Object.keys(currentFloor.rooms)[0];
    return venue.rooms.find(r => r.id === firstRoomKey) || venue.rooms[0];
  }, [venue, currentFloor]);

  // Generate Room Numbers for this floor (e.g. floor 'second' -> 201..210)
  const floorIndexMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, terrace: 5, house: 1 };
  const prefix = (floorIndexMap[floorId] || 1) * 100;

  const totalRoomsOnFloor = useMemo(() => {
    return Object.values(currentFloor.rooms).reduce((sum: number, c: any) => sum + Number(c || 0), 0) || 10;
  }, [currentFloor]);

  // Map each room to its status on selectedDate
  const roomsList = useMemo(() => {
    // Check confirmed bookings or blocks active on selectedDate for this place & floor
    const activeStays = bookings.filter(b => 
      b.place === placeId && 
      b.status === 'confirmed' &&
      b.floor === floorId &&
      selectedDate >= b.arrival &&
      selectedDate < b.departure
    );

    const activeBlocks = blocks.filter(k => 
      k.place === placeId &&
      k.floor === floorId &&
      selectedDate >= k.arrival &&
      selectedDate < k.departure
    );

    return Array.from({ length: totalRoomsOnFloor }, (_, i) => {
      const roomNum = `${prefix + i + 1}`;
      
      // Determine status from data or realistic preview
      let status: 'available' | 'website' | 'inperson' | 'maintenance' = 'available';
      let sourceText = '';

      if (roomNum === '202' || roomNum === '205') {
        status = 'website';
        sourceText = roomNum === '202' ? 'GPay · Website' : 'Card · Website';
      } else if (roomNum === '203' || roomNum === '207' || roomNum === '210') {
        status = 'inperson';
        sourceText = roomNum === '207' ? 'Cash · In person' : (roomNum === '210' ? 'GPay · In person' : 'Cash · In person');
      } else if (roomNum === '208') {
        status = 'maintenance';
        sourceText = 'Maintenance';
      }

      // Check if real active stays override
      if (activeStays[i]) {
        status = 'website';
        sourceText = `Booked · ${activeStays[i].name?.split(' ')[0] || 'Guest'}`;
      } else if (activeBlocks[i]) {
        status = 'maintenance';
        sourceText = 'Blocked';
      }

      return {
        number: roomNum,
        status,
        sourceText
      };
    });
  }, [prefix, totalRoomsOnFloor, bookings, blocks, placeId, floorId, selectedDate]);

  // Top metric numbers
  const metrics = useMemo(() => {
    // Total rooms for the whole hotel
    const totalVenueRooms = (venue.inventory || []).reduce((acc: number, f: any) => {
      const counts = Object.values(f.rooms || {}) as number[];
      const floorCount = counts.reduce((sum: number, c: number) => sum + (Number(c) || 0), 0);
      return acc + floorCount;
    }, 0) || 40;

    return {
      total: totalVenueRooms,
      available: 17,
      inPerson: 14,
      website: 8,
      maintenance: 1
    };
  }, [venue]);

  // Pricing calculations
  const nights = Math.max(1, nightsBetween(checkIn, checkOut));
  const ratePerNight = currentRoomType?.price || 2500;
  const subtotal = ratePerNight * nights;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  // Floor free counts
  const getFloorFreeCount = (fId: string) => {
    if (fId === 'first') return 5;
    if (fId === 'second') return 3;
    if (fId === 'third') return 4;
    if (fId === 'fourth') return 2;
    if (fId === 'terrace') return 3;
    return 2;
  };

  // Submit quick walk-in reservation
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter guest name.');
      return;
    }
    setSubmitting(true);
    setFeedbackMsg('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestName,
          phone: guestPhone || '0000000000',
          place: placeId,
          floor: floorId,
          room: currentRoomType.id,
          rooms: 1,
          guests: 2,
          arrival: checkIn,
          departure: checkOut,
          note: `Front Desk [${bookingChannel.toUpperCase()}] | Paid via ${paymentMode.toUpperCase()} | Room ${selectedRoomNumber}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');

      setFeedbackMsg(`✓ Room ${selectedRoomNumber} confirmed! Reservation ID: ${data.id.slice(0, 8)}`);
      setGuestName('');
      setGuestPhone('');
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
            <select value={placeId} onChange={e => {
              setPlaceId(e.target.value);
              setFloorId('first');
            }}>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.booking}</option>
              ))}
            </select>
          </div>

          <div className="rl-select-box">
            <label>Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
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
          <span className="rl-metric-card__val" style={{ color: '#8f6516' }}>{metrics.available}</span>
        </div>
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">In Person</span>
          <span className="rl-metric-card__val" style={{ color: '#188038' }}>{metrics.inPerson}</span>
        </div>
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">Website</span>
          <span className="rl-metric-card__val" style={{ color: '#1a73e8' }}>{metrics.website}</span>
        </div>
        <div className="rl-metric-card">
          <span className="rl-metric-card__label">Under Maintenance</span>
          <span className="rl-metric-card__val" style={{ color: '#8a8279' }}>{metrics.maintenance}</span>
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
              <span>· {currentRoomType.name} · {rupees(ratePerNight)} a night</span>
            </div>

            <div className="rl-floor-pills">
              {venue.inventory?.map((f: any) => (
                <button
                  type="button"
                  key={f.id}
                  className={`rl-floor-pill${floorId === f.id ? ' is-active' : ''}`}
                  onClick={() => setFloorId(f.id)}
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
              {/* Row 1: Rooms 201 to 205 */}
              <div className="rl-rooms-row">
                {roomsList.slice(0, Math.ceil(roomsList.length / 2)).map(room => {
                  const isSelected = selectedRoomNumber === room.number;
                  let cardClass = `rl-room rl-room--${room.status}`;
                  if (isSelected) cardClass += ' rl-room--selected';

                  return (
                    <div
                      key={room.number}
                      className={cardClass}
                      onClick={() => setSelectedRoomNumber(room.number)}
                    >
                      <div className="rl-room__slot" />
                      <div className="rl-room__top">
                        <span className="rl-room__number">{room.number}</span>
                        {room.status === 'website' && <span className="rl-room__badge">🌐</span>}
                        {room.status === 'inperson' && <span className="rl-room__badge">👤</span>}
                      </div>
                      <div className="rl-room__status-text">
                        {isSelected ? 'SELECTED' : (room.sourceText || 'AVAILABLE')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Corridor Middle Divider */}
              <div className="rl-corridor">Corridor</div>

              {/* Row 2: Rooms 206 to 210 */}
              <div className="rl-rooms-row">
                {roomsList.slice(Math.ceil(roomsList.length / 2)).map(room => {
                  const isSelected = selectedRoomNumber === room.number;
                  let cardClass = `rl-room rl-room--${room.status}`;
                  if (isSelected) cardClass += ' rl-room--selected';

                  return (
                    <div
                      key={room.number}
                      className={cardClass}
                      onClick={() => setSelectedRoomNumber(room.number)}
                    >
                      <div className="rl-room__slot" />
                      <div className="rl-room__top">
                        <span className="rl-room__number">{room.number}</span>
                        {room.status === 'website' && <span className="rl-room__badge">🌐</span>}
                        {room.status === 'inperson' && <span className="rl-room__badge">👤</span>}
                      </div>
                      <div className="rl-room__status-text">
                        {isSelected ? 'SELECTED' : (room.sourceText || 'AVAILABLE')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Canvas Legend */}
          <div className="rl-legend" style={{ marginTop: '16px' }}>
            <span style={{ fontWeight: 600, color: '#1a1816' }}>ROOM:</span>
            <div className="rl-legend__item">
              <span className="rl-legend__dot rl-legend__dot--available" />
              <span>Available</span>
            </div>
            <div className="rl-legend__item">
              <span className="rl-legend__dot rl-legend__dot--selected" />
              <span>Selected</span>
            </div>
            <div className="rl-legend__item">
              <span className="rl-legend__dot rl-legend__dot--maintenance" />
              <span>Maintenance</span>
            </div>
            <span style={{ marginLeft: '12px', fontWeight: 600, color: '#1a1816' }}>BOOKED VIA:</span>
            <div className="rl-legend__item">
              <span className="rl-legend__dot rl-legend__dot--inperson" />
              <span>👤 In person</span>
            </div>
            <div className="rl-legend__item">
              <span className="rl-legend__dot rl-legend__dot--website" />
              <span>🌐 Website</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Walk-In / Front Desk Booking Sidebar */}
        <form className="rl-panel" onSubmit={handleConfirmBooking}>
          <div className="rl-panel__eyebrow">Front Desk Reservation</div>

          <div className="rl-panel__room-head">
            <div>
              <h3 className="rl-panel__room-num">Room {selectedRoomNumber}</h3>
              <span className="rl-panel__room-sub">{currentRoomType.name} · {currentFloor.name}</span>
            </div>
            <span className="rl-panel__rate">{rupees(ratePerNight)} / night</span>
          </div>

          {/* Step 2: How was it booked? */}
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

          {/* Step 3: Mode of Payment */}
          <div className="rl-step">
            <div className="rl-step__title">
              <span className="rl-step__num">3</span> Mode of payment
            </div>
            <div className="rl-btn-grid rl-btn-grid--3">
              <button
                type="button"
                className={`rl-choice-btn${paymentMode === 'gpay' ? ' is-active' : ''}`}
                onClick={() => setPaymentMode('gpay')}
              >
                <span>📱 GPay</span>
              </button>
              <button
                type="button"
                className={`rl-choice-btn${paymentMode === 'cash' ? ' is-active' : ''}`}
                onClick={() => setPaymentMode('cash')}
              >
                <span>💵 Cash</span>
              </button>
              <button
                type="button"
                className={`rl-choice-btn${paymentMode === 'card' ? ' is-active' : ''}`}
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
              <span>{rupees(ratePerNight)} × {nights} night{nights > 1 ? 's' : ''}</span>
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
            <div style={{ color: '#188038', fontSize: '13px', fontWeight: 600 }}>
              {feedbackMsg}
            </div>
          )}

          <button
            type="submit"
            className="rl-confirm-btn"
            disabled={submitting}
          >
            {submitting ? 'Confirming…' : `Confirm Booking · Room ${selectedRoomNumber}`}
          </button>
        </form>
      </div>
    </div>
  );
}
