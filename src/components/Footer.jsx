import { useRef } from 'react';
import { gsap, useGSAP, reduceMotion } from '../motion';
import { contact } from '../data/venues';
import { PAGES, placePath } from '../data/pages';
import SiteLink from './SiteLink';

const tel = n => `tel:${n.replace(/\s/g, '')}`;

export default function Footer() {
  const ref = useRef(null);

  useGSAP(() => {
    if (reduceMotion) return;
    gsap.from('.footer__crest', {
      opacity: 0, y: 30, scale: 0.9, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%' }
    });
  }, { scope: ref });

  return (
    <footer className="footer" ref={ref}>
      <div className="footer__top">
        <img src="/assets/logo-crest-sm.webp" alt="SKR Sivabhagya crest" className="footer__crest" />
        <p className="footer__word">SKR <i>·</i> SIVABHAGYA</p>
        <nav className="footer__nav" aria-label="Footer">
          {PAGES.map(p => <SiteLink key={p.path} to={p.path}>{p.label}</SiteLink>)}
        </nav>
      </div>

      <div className="footer__cols">
        <div><h4><SiteLink to={placePath('kodaikanal')}>Kodaikanal</SiteLink></h4><p>Adventure Resort<br />Kodaikanal, Tamil Nadu</p></div>
        <div><h4><SiteLink to={placePath('arapalayam')}>Aarapalayam</SiteLink></h4><p>47, D.D. Main Road, Arappalayam<br />Madurai 625016</p></div>
        <div><h4><SiteLink to={placePath('kochadai')}>Kochadai</SiteLink></h4><p>Service Apartments<br />Kochadai, Madurai</p></div>
        <div>
          <h4>Contact</h4>
          <p>
            {contact.phones.map(p => <span key={p}><a href={tel(p)}>{p}</a><br /></span>)}
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </p>
        </div>
      </div>

      <div className="footer__base">
        <span>&copy; {new Date().getFullYear()} SKR Sivabhagya</span>
        <SiteLink to="#top">Back to top ↑</SiteLink>
      </div>
    </footer>
  );
}
