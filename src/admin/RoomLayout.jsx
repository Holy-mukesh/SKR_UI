import { useState, useMemo } from 'react';
import { venues } from '../data/venues';
import { addDays, unitKey, freeByNight } from '../lib/stay';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const PAYMENT_METHODS = {
  gpay: 'GPay',
  cash: 'Cash',
  card: 'Card'
};

const BOOKING_SOURCES = {
  'in-person': 'In person',
  website: 'Website'
};

export default function RoomLayout({ bookings, blocks, onBookRoom }) {
  const [placeId, setPlaceId] = useState(venues[0].id);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Booking form state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState('');
  const [nights, setNights] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState('gpay');
  const [bookingSource, setBookingSource] = useState('in-person');
  const [amount, setAmount] = useState('');

  const venue = venues.find(v => v.id === placeId);
  
  // Get all floors and rooms
  const floors = venue.inventory;
  
  // Calculate room statistics for the selected date
  const roomStats = useMemo(() => {
    const today = selectedDate;
    const stats = {
      total: 0,
      available: 0,
      inPerson: 0,
      website: 0,
      maintenance: 0
    };

    floors.forEach(floor => {
      Object.entries(floor.rooms).forEach(([roomId, count]) => {
        stats.total += count;
        
        // Check bookings for this date
        const confirmedBookings = bookings.filter(b => 
          b.place === placeId &&
          b.status === 'confirmed' &&
          b.arrival <= today &&
          b.departure > today &&
          b.room === roomId &&
          b.floor === floor.id
        );

        const bookedCount = confirmedBookings.reduce((sum, b) => sum + (b.rooms || 1), 0);
        const availableCount = count - bookedCount;
        
        stats.available += availableCount;

        // Count by source
        confirmedBookings.forEach(b => {
          const rooms = b.rooms || 1;
          if (b.source === 'website' || !b.source) {
            stats.website += rooms;
          } else {
            stats.inPerson += rooms;
          }
        });
      });
    });

    // Count maintenance blocks
    const maintenanceBlocks = blocks.filter(b =>
      b.place === placeId &&
      b.arrival <= today &&
      b.departure > today
    );
    stats.maintenance = maintenanceBlocks.reduce((sum, b) => sum + (b.rooms || 1), 0);
    stats.available -= stats.maintenance;

    return stats;
  }, [bookings, blocks, placeId, selectedDate, floors]);

  // Get room details with booking status
  const getRoomStatus = (floor, roomId) => {
    const room = venue.rooms.find(r => r.id === roomId);
    const totalCount = floor.rooms[roomId];
    
    const confirmedBookings = bookings.filter(b => 
      b.place === placeId &&
      b.status === 'confirmed' &&
      b.arrival <= selectedDate &&
      b.departure > selectedDate &&
      b.room === roomId &&
      b.floor === floor.id
    );

    const maintenanceBlocks = blocks.filter(b =>
      b.place === placeId &&
      b.room === roomId &&
      b.floor === floor.id &&
      b.arrival <= selectedDate &&
      b.departure > selectedDate
    );

    const bookedCount = confirmedBookings.reduce((sum, b) => sum + (b.rooms || 1), 0);
    const maintenanceCount = maintenanceBlocks.reduce((sum, b) => sum + (b.rooms || 1), 0);
    const availableCount = totalCount - bookedCount - maintenanceCount;

    let status = 'available';
    let paymentType = null;
    let source = null;

    if (maintenanceCount > 0) {
      status = 'maintenance';
    } else if (bookedCount > 0) {
      if (bookedCount === totalCount) {
        status = 'selected'; // fully booked
      }
      // Get payment method and source from the first booking
      if (confirmedBookings.length > 0) {
        const booking = confirmedBookings[0];
        paymentType = booking.paymentMethod || 'gpay';
        source = booking.source || 'website';
      }
    }

    return {
      room,
      totalCount,
      bookedCount,
      maintenanceCount,
      availableCount,
      status,
      paymentType,
      source,
      bookings: confirmedBookings
    };
  };

  const handleRoomClick = (floor, roomId) => {
    const roomStatus = getRoomStatus(floor, roomId);
    if (roomStatus.availableCount > 0) {
      setSelectedRoom({ floor, roomId, ...roomStatus });
      setShowBookingForm(true);
      setCheckIn(selectedDate);
      // Set default checkout to 2 nights later
      const checkOutDate = addDays(selectedDate, 2);
      setCheckOut(checkOutDate);
      setNights(2);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    const bookingData = {
      place: placeId,
      floor: selectedRoom.floor.id,
      room: selectedRoom.roomId,
      rooms: 1,
      arrival: checkIn,
      departure: checkOut,
      name: guestName,
      phone: guestPhone,
      guests: 2,
      status: 'confirmed',
      paymentMethod,
      source: bookingSource,
      estimate: { total: parseInt(amount) || 0 },
      note: `Booked via Room Layout - ${paymentMethod} - ${bookingSource}`
    };

    try {
      await onBookRoom(bookingData);
      // Reset form
      setShowBookingForm(false);
      setSelectedRoom(null);
      setGuestName('');
      setGuestPhone('');
      setAmount('');
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const updateNights = (newCheckIn, newCheckOut) => {
    if (newCheckIn && newCheckOut) {
      const start = new Date(newCheckIn);
      const end = new Date(newCheckOut);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setNights(diffDays);
    }
  };

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Room Layout <span className="adm-muted">· {venue.booking}, {venue.location}</span></h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label className="adm-field" style={{ margin: 0 }}>
            <span>Place</span>
            <select value={placeId} onChange={e => setPlaceId(e.target.value)}>
              {venues.map(v => <option key={v.id} value={v.id}>{v.booking}</option>)}
            </select>
          </label>
          <label className="adm-field" style={{ margin: 0 }}>
            <span>Date</span>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </label>
        </div>
      </div>

      {/* Room Statistics */}
      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="adm-stat">
          <span className="adm-stat__label">Rooms Tonight</span>
          <span className="adm-stat__value">{roomStats.total}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Available</span>
          <span className="adm-stat__value" style={{ color: 'var(--success)' }}>{roomStats.available}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">In Person</span>
          <span className="adm-stat__value">{roomStats.inPerson}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Website</span>
          <span className="adm-stat__value">{roomStats.website}</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__label">Under Maintenance</span>
          <span className="adm-stat__value">{roomStats.maintenance}</span>
        </div>
      </div>

      {/* Floor Layout */}
      {floors.map(floor => (
        <div key={floor.id} className="adm-panel" style={{ marginTop: '20px' }}>
          <div className="adm-panel__head">
            <h2>{floor.name} · {floor.category} · ₹{floor.price.toLocaleString('en-IN')} a night</h2>
          </div>
          
          {/* Room Grid */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            flexWrap: 'wrap',
            marginTop: '16px',
            padding: '20px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-light)'
          }}>
            {Object.entries(floor.rooms).map(([roomId, count]) => {
              const roomStatus = getRoomStatus(floor, roomId);
              const room = roomStatus.room;
              
              // Create individual room cards based on count
              return Array.from({ length: count }).map((_, index) => {
                const isBooked = index < roomStatus.bookedCount;
                const isMaintenance = !isBooked && index < (roomStatus.bookedCount + roomStatus.maintenanceCount);
                const isAvailable = !isBooked && !isMaintenance;
                
                let cardClass = 'room-card';
                let statusIcon = '';
                let statusText = 'Available';
                let bgColor = 'var(--room-available)';
                
                if (isMaintenance) {
                  cardClass += ' room-maintenance';
                  statusText = 'Maintenance';
                  bgColor = 'var(--room-maintenance)';
                } else if (isBooked && roomStatus.bookings[0]) {
                  const booking = roomStatus.bookings[0];
                  if (booking.paymentMethod === 'gpay' && booking.source === 'website') {
                    cardClass += ' room-gpay-website';
                    statusIcon = '🌐';
                    statusText = 'GPay · Website';
                    bgColor = 'var(--room-gpay-website)';
                  } else if (booking.paymentMethod === 'cash' && booking.source === 'in-person') {
                    cardClass += ' room-cash-person';
                    statusIcon = '👤';
                    statusText = 'Cash · In Person';
                    bgColor = 'var(--room-cash-person)';
                  } else if (booking.paymentMethod === 'card' && booking.source === 'website') {
                    cardClass += ' room-card-website';
                    statusIcon = '💳';
                    statusText = 'Card · Website';
                    bgColor = 'var(--room-card-website)';
                  }
                } else if (isAvailable) {
                  bgColor = 'var(--room-available)';
                }
                
                return (
                  <div
                    key={`${roomId}-${index}`}
                    className={cardClass}
                    style={{
                      flex: '0 0 160px',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      background: bgColor,
                      cursor: isAvailable ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onClick={() => isAvailable && handleRoomClick(floor, roomId)}
                  >
                    {/* Room Number */}
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: '600',
                      marginBottom: '4px',
                      color: 'var(--text-primary)'
                    }}>
                      {room.name}
                    </div>
                    
                    {/* Status Bar */}
                    <div style={{
                      height: '3px',
                      background: isBooked ? 'var(--gold)' : isMaintenance ? '#999' : 'transparent',
                      marginBottom: '8px',
                      borderRadius: '2px'
                    }} />
                    
                    {/* Status Text */}
                    <div style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'var(--text-muted)',
                      marginBottom: '4px'
                    }}>
                      {statusText}
                    </div>
                    
                    {/* Icon */}
                    {statusIcon && (
                      <div style={{ fontSize: '20px', marginTop: '8px' }}>
                        {statusIcon}
                      </div>
                    )}
                    
                    {/* Booking details for booked rooms */}
                    {isBooked && roomStatus.bookings[0] && (
                      <div style={{
                        fontSize: '11px',
                        marginTop: '8px',
                        color: 'var(--text-secondary)',
                        borderTop: '1px solid var(--border-light)',
                        paddingTop: '8px'
                      }}>
                        <div><strong>{roomStatus.bookings[0].name}</strong></div>
                        <div>{roomStatus.bookings[0].phone}</div>
                      </div>
                    )}
                    
                    {/* Tap to book hint */}
                    {isAvailable && (
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--gold)',
                        marginTop: '8px',
                        fontStyle: 'italic'
                      }}>
                        Tap to book
                      </div>
                    )}
                  </div>
                );
              });
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="adm-panel" style={{ marginTop: '20px' }}>
        <div className="adm-panel__head">
          <h2>Legend</h2>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--room-available)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            <span>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--room-gpay-website)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            <span>🌐 GPay · Website</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--room-cash-person)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            <span>👤 Cash · In Person</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--room-card-website)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            <span>💳 Card · Website</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--room-maintenance)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            <span>Maintenance</span>
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            border: '1px solid var(--border)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontFamily: 'var(--serif)', color: 'var(--text-primary)' }}>
                New Booking · Room {selectedRoom.room?.name}
              </h2>
              <button 
                onClick={() => setShowBookingForm(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Deluxe · {selectedRoom.floor.name}</div>
                <div style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)' }}>₹{selectedRoom.floor.price.toLocaleString('en-IN')} / night</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="adm-field">
                  <span>How was it booked?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setBookingSource('in-person')}
                      className={`adm-btn ${bookingSource === 'in-person' ? 'adm-btn--gold' : ''}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>👤</span> In person
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingSource('website')}
                      className={`adm-btn ${bookingSource === 'website' ? 'adm-btn--gold' : ''}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>🌐</span> Website
                    </button>
                  </div>
                </label>
              </div>

              <label className="adm-field">
                <span>Mode of Payment</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPaymentMethod(key)}
                      className={`adm-btn ${paymentMethod === key ? 'adm-btn--gold' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {key === 'gpay' && '📱'}
                      {key === 'cash' && '💵'}
                      {key === 'card' && '💳'}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </label>

              <label className="adm-field">
                <span>Guest Name</span>
                <input 
                  type="text" 
                  value={guestName} 
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Ramesh K."
                  required 
                />
              </label>

              <label className="adm-field">
                <span>Phone</span>
                <input 
                  type="tel" 
                  value={guestPhone} 
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder="98400 12345"
                  required 
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label className="adm-field">
                  <span>Check-in</span>
                  <input 
                    type="date" 
                    value={checkIn} 
                    onChange={e => {
                      setCheckIn(e.target.value);
                      updateNights(e.target.value, checkOut);
                    }}
                    required 
                  />
                </label>

                <label className="adm-field">
                  <span>Check-out</span>
                  <input 
                    type="date" 
                    value={checkOut} 
                    onChange={e => {
                      setCheckOut(e.target.value);
                      updateNights(checkIn, e.target.value);
                    }}
                    required 
                  />
                </label>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <strong>{nights} night{nights !== 1 ? 's' : ''}</strong> · {checkIn} → {checkOut}
              </div>

              <label className="adm-field">
                <span>Total (₹)</span>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`₹${(selectedRoom.floor.price * nights).toLocaleString('en-IN')}`}
                />
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowBookingForm(false)} className="adm-btn" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="adm-btn adm-btn--gold" style={{ flex: 1 }}>
                  Confirm Booking · Room {selectedRoom.room?.name}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
