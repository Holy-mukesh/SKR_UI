import React, { useState } from 'react';

const STAR = 'M12 2.6l2.8 6.1 6.6.7-4.9 4.5 1.4 6.5L12 17.1l-5.9 3.3 1.4-6.5-4.9-4.5 6.6-.7z';

function Star({ fill }: { fill: number }) {
  // fill: 0..1 (allows half stars in averages)
  const id = `s${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 24 24" className="star" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="currentColor" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${id})`} stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/* Read-only stars, e.g. 4.5 */
export function Stars({ value, label }: { value: number; label?: string }) {
  return (
    <span className="stars" role="img" aria-label={label ?? `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => <Star key={n} fill={Math.max(0, Math.min(1, value - n + 1))} />)}
    </span>
  );
}

/* Star picker: a radio group of five, with hover preview and arrow-key support */
export function StarInput({
  value,
  onChange,
  invalid
}: {
  value: number;
  onChange: (val: number) => void;
  invalid?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(5, value + 1)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, value - 1)); }
  };

  return (
    <div className={`star-input${invalid ? ' is-invalid' : ''}`}>
      <div role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)} onKeyDown={onKey}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            className={n <= shown ? 'is-on' : undefined}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
          >
            <Star fill={n <= shown ? 1 : 0} />
          </button>
        ))}
      </div>
      <span className="star-input__word" aria-hidden="true">{words[shown]}</span>
    </div>
  );
}
