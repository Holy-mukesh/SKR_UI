import SiteLink from './SiteLink';

/* Short invitation to the booking page, shown where the full form used to sit */
export default function ReserveCta({ venue }) {
  const to = venue ? `/reserve?place=${venue.id}` : '/reserve';
  return (
    <section className="reserve-cta">
      <p className="eyebrow">Reserve</p>
      <h2 className="display">
        {venue ? <>Stay at <em>{venue.name}.</em></> : <>Plan your <em>stay.</em></>}
      </h2>
      <p className="reserve-cta__text">Check live availability, choose your room and send a request in a minute.</p>
      <SiteLink to={to} location={venue?.booking} className="btn-gold">Check availability</SiteLink>
    </section>
  );
}
