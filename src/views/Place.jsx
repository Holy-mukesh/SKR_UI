import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSite } from '../site';
import { venues } from '../data/venues';
import Page from '../components/Page';
import Venue from '../components/Venue';
import Locations from '../components/Locations';
import Reserve from '../components/Reserve';
import Backdrop from '../components/Backdrop';

function PlacePage({ venue }) {
  const { setLocation } = useSite();

  // The booking form on this page starts on this place
  useEffect(() => setLocation(venue.booking), [venue, setLocation]);

  return (
    <>
      {venue.backdrop && <Backdrop photo={venue.backdrop} />}
      <Page className={venue.backdrop ? 'page--backdrop' : ''}>
        <Venue venue={venue} />
        <Locations exclude={venue.id} eyebrow="Also from Sivabhagya" lines={['Our other', <em>addresses.</em>]} />
        <Reserve />
      </Page>
    </>
  );
}

/* /places/:id — keyed by id so moving between places starts each page fresh */
export default function Place() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const venue = venues.find(v => v.id === id);

  useEffect(() => {
    if (!venue) {
      router.replace('/places');
    }
  }, [venue, router]);

  if (!venue) return null;
  return <PlacePage key={venue.id} venue={venue} />;
}
