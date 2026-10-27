import { useState } from 'react';
import Intro from '../components/Intro';
import Stage from '../components/Stage';
import Page from '../components/Page';
import Motif from '../components/Motif';
import PlacesCarousel from '../components/PlacesCarousel';
import Statement from '../components/Statement';
import Nearby from '../components/Nearby';
import Invite from '../components/Invite';
import Reserve from '../components/Reserve';

export default function Home({ introPending, onIntroDone }) {
  // Decided once per mount, so coming back to Home later doesn't replay the intro
  const [playIntro] = useState(() => introPending.current);

  return (
    <>
      {playIntro && <Intro onDone={onIntroDone} />}
      <Stage />
      <Page hero>
        <Statement />
        <Motif />
        <PlacesCarousel />
        <Nearby />
        <Invite />
        <Reserve />
      </Page>
    </>
  );
}
