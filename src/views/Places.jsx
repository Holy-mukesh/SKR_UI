import Page from '../components/Page';
import PageHeader from '../components/PageHeader';
import Locations from '../components/Locations';
import Reserve from '../components/Reserve';
import Backdrop from '../components/Backdrop';
import Stack from '../components/Stack';
import { venues } from '../data/venues';

// The reception wall from the About page, shown at half strength
const photo = { src: '/assets/about-reception.webp', small: '/assets/about-reception-sm.webp' };

/* The three places as a deck of photos that deals itself every 2 seconds, looping round */
const cards = venues.map(v => (
  <figure className="place-card" key={v.id}>
    <img src={v.cover.src} alt={v.cover.alt} draggable={false} />
    <figcaption>
      <small>{v.type}</small>
      <b>{v.name}</b>
    </figcaption>
  </figure>
));

/* Overview: one box per place, each opening its own page */
export default function Places() {
  return (
    <>
      <Backdrop photo={photo} dim />
      <Page className="page--backdrop">
        <PageHeader
          tall
          eyebrow="Our Places"
          lines={['Three addresses.', <em>One welcome.</em>]}
          intro="From the cool of the Kodaikanal Hills to the heart of the temple city — choose the stay that suits your journey."
          aside={
            <div className="places-stack">
              <Stack
                layout="fan"
                cards={cards}
                autoplay
                autoplayDelay={2000}
                sendToBackOnClick
                speed={0.7}
                radius={4}
                frame={2}
                frameColor="#c09d58"
              />
            </div>
          }
        />
        <Locations showHead={false} />
        <Reserve />
      </Page>
    </>
  );
}
