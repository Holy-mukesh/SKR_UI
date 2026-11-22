import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { useSite } from '../site';
import DriftWall from './DriftWall';

const pad = n => String(n).padStart(2, '0');

/*
  Wall size for the screen it is on: tiles scale with the width, there are always enough columns
  to reach both edges (the wall is tilted, so a couple more than fit flat), and the wall is
  about as tall as the window.
*/
const layoutFor = (width, viewHeight) => {
  const tileWidth = Math.round(Math.min(320, Math.max(140, width / 6.2)));
  const tileHeight = Math.round(tileWidth * 0.86);
  const gap = width < 600 ? 10 : 14;
  const columns = Math.ceil(width / (tileWidth + gap)) + 2;
  const height = Math.round(Math.min(1000, Math.max(440, viewHeight * 0.9)));
  return { columns, tileWidth, tileHeight, gap, height };
};

/* A place's photos as a slowly drifting 3D wall; any tile opens the full-screen viewer */
export default function Gallery({ venue }) {
  const { openLightbox } = useSite();
  const ref = useRef(null);
  // Measured in the browser only (the wall shuffles photos and sizes to the window, so it isn't rendered on the server)
  const [screen, setScreen] = useState(null);
  const { photos } = venue;

  useEffect(() => {
    // the wall runs edge to edge, so the window size is the size that matters
    const onResize = () => setScreen({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  const items = useMemo(
    () => photos.map((p, index) => ({ image: p.thumb, title: p.alt, index })),
    [photos]
  );
  const { height, ...size } = layoutFor(screen?.width ?? 1440, screen?.height ?? 900);

  useGSAP(() => {
    if (reduceMotion) return;
    gsap.from('.gallery__wall', {
      opacity: 0, y: 60, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%' }
    });
  }, { scope: ref });

  return (
    <div className="gallery" ref={ref}>
      <div className="gallery__head">
        <span>Gallery</span>
        <span>{pad(photos.length)} photographs</span>
      </div>

      <div className="gallery__wall" style={{ height }}>
        {screen && <DriftWall
          items={items}
          {...size}
          tilt={16}
          turn={-14}
          perspective={1200}
          depth={120}
          speed={18}
          direction="up"
          variance={0.5}
          parallax={0.6}
          lift={64}
          fade={0.12}
          dim={1}
          overlayColor="transparent"
          radius={10}
          label={`${venue.name} photographs`}
          onItemClick={item => openLightbox(venue.id, item.index)}
        />}
      </div>

      <button className="gallery__more" onClick={() => openLightbox(venue.id, 0)}>
        <span>View all {photos.length} photos</span>
      </button>
    </div>
  );
}
