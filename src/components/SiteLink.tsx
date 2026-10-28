import React from 'react';
import { useSite } from '../site';

export interface SiteLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  location?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/*
  One link for the whole site:
  - "#id" or "/same-page#id" glides to that spot
  - "/other-page" (optionally with "#id") plays the curtain transition, then lands there
  It can also preselect a booking location.
*/
export default function SiteLink({ to, location, children, onClick, ...rest }: SiteLinkProps) {
  const { go, setLocation } = useSite();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let "open in new tab" work
    e.preventDefault();
    if (location) setLocation(location);
    go(to);
    onClick?.(e);
  };

  return <a href={to} onClick={handleClick} {...rest}>{children}</a>;
}
