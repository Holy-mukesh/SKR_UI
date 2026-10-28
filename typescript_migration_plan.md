# Implementation Plan: Migrating Next.js Project to TypeScript

## Goal Description
Explain why TypeScript was not used during the initial migration from Vite to Next.js, and outline a clear, non-disruptive plan to migrate the Next.js codebase to TypeScript (`.ts` / `.tsx`).

---

## Why TypeScript Wasn't Used in the Initial Migration
1. **Preserving Exact Code & Zero Regression**: The original repository was entirely written in pure JavaScript (`.jsx` and `.js`). Migrating from Vite to Next.js already involved structural changes (routing, server actions/handlers, CSS imports, `Link` component replacements). Keeping JavaScript avoided introducing hundreds of type errors or slowing down the migration.
2. **Speed & Smooth Transition**: The initial priority was getting Next.js running with the existing logic, Leaflet maps, Lenis smooth scrolling, GSAP animations, and JSON database endpoints.
3. **Next.js Supports Incremental TypeScript Adoption**: Next.js allows JavaScript and TypeScript to coexist seamlessly. We can enable TypeScript anytime without breaking existing `.jsx` files.

---

## Why TypeScript is a Great Idea for This Project
- **Data Models**: Clear interfaces for `Booking`, `Review`, `RoomBlock`, and `VenueUnit`.
- **API Safety**: Strict typing on request/response payloads in `/api/bookings`, `/api/reviews`, etc.
- **Admin Dashboard**: Eliminates common runtime bugs (such as undefined date calculations or status mismatches).

---

## User Review Required
> [!NOTE]
> Next.js supports an **incremental migration**. We can install TypeScript and `tsconfig.json`, convert the server library and API routes first, and convert UI components page-by-page.

---

## Proposed Migration Plan

### Phase 1: Setup TypeScript in Next.js
1. Install TypeScript dev dependencies:
   ```bash
   npm install -D typescript @types/node @types/react @types/react-dom
   ```
2. Initialize `tsconfig.json` automatically via Next.js (`next dev` generates a recommended config).

### Phase 2: Define Core Types (`src/types/`)
Create shared interfaces in `src/types/index.ts`:
- `Venue`, `VenueUnit`, `PricingTier`
- `Booking`, `BookingStatus` (`'new' | 'confirmed' | 'cancelled'`)
- `Review`, `ReviewStatus` (`'pending' | 'approved' | 'rejected'`)
- `RoomBlock`

### Phase 3: Migrate Server & API Layer
- Convert [`src/lib/server/store.js`](file:///c:/Vicky/skr-project/src/lib/server/store.js) -> `store.ts`
- Convert [`src/lib/server/auth.js`](file:///c:/Vicky/skr-project/src/lib/server/auth.js) -> `auth.ts`
- Convert [`src/lib/server/validation.js`](file:///c:/Vicky/skr-project/src/lib/server/validation.js) -> `validation.ts`
- Convert API route handlers `route.js` -> `route.ts` (using `NextRequest`, `NextResponse`)

### Phase 4: Migrate Utilities & Components
- Convert [`src/lib/stay.js`](file:///c:/Vicky/skr-project/src/lib/stay.js) -> `stay.ts`
- Convert components (`SiteShell`, `Nav`, `Reserve`, `Venue`, `Stars`) to `.tsx`
- Convert pages (`src/app/**/page.jsx`) to `page.tsx`

---

## Verification Plan
### Automated Verification
```bash
npx tsc --noEmit
npm run build
```
### Manual Verification
- Verify dev server starts (`npm run dev`)
- Ensure `/admin`, `/places`, and booking forms function without compile or runtime errors.
