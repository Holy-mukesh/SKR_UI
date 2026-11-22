import { useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSite } from '../site';
import { venues } from '../data/venues';
import Page from '../components/Page';
import Reserve from '../components/Reserve';

/*
  /reserve — the booking form on its own page.
  /reserve?place=kodaikanal opens it with that place already chosen (used by the place pages).
*/
export default function ReserveView() {
  const params = useSearchParams();
  const { setLocation } = useSite();
  const venue = venues.find(v => v.id === params.get('place'));
  const [ready, setReady] = useState(false);

  // Settle the place before the form mounts, so it starts on the right floors and rooms
  useLayoutEffect(() => {
    if (venue) setLocation(venue.booking);
    setReady(true);
  }, [venue, setLocation]);

  return (
    <Page footer={false}>
      {ready && <Reserve key={venue?.id || 'any'} placeChosen={!!venue} bare />}
    </Page>
  );
}
