import { createContext, useContext } from 'react';
import { venues } from '../data/venues';

/*
  The signed-in admin and the properties they manage.
  A property admin ({ place: 'kodaikanal' }) sees only that place; the superadmin (place: null) sees all.
  The server enforces the same rule, so this only keeps the screens tidy.
*/
export const AdminContext = createContext({ user: null, venues });

export const scopeFor = user => ({
  user,
  venues: user?.place ? venues.filter(v => v.id === user.place) : venues
});

export const useAdmin = () => useContext(AdminContext);
export const useAdminVenues = () => useContext(AdminContext).venues;
