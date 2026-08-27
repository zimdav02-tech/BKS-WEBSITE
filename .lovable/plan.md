# Live Bookings, Requests & Real-Time Admin Sync

Update the existing BKS site in place. No route, page, styling, or auth rewrites — everything below extends what is already there.

## What I verified first

- The database already has bookings, booking_services, payments, airport_transfers, notifications, conversations/messages, profiles, user_roles, audit_logs, with role-aware policies (`is_staff`, `is_super_admin`) already in place.
- The super-admin rule already exists as a signup trigger for zimdav02@gmail.com, but **no auth user with that email exists yet**, so the role has never been granted.
- Nothing in the app currently creates a booking or a request: portal "New booking" quick actions only link to marketing pages, and there are zero booking rows.
- Admin module pages (`/admin/<module>`) are placeholders, and the dashboard KPI cards are hardcoded strings.
- Real-time is enabled for bookings, notifications and messages only; only the customer portal subscribes.

## 1. Super Admin

- Keep the existing trigger and protection rules.
- Add a "claim" path so the account is granted correctly no matter the order of events: if the profile/user already exists for that email, grant `super_admin` immediately; otherwise the signup trigger continues to handle it.
- The account still has to be created once by signing up (or Google sign-in) with zimdav02@gmail.com — the role, profile and protections then apply automatically and cannot be removed by other admins.

## 2. Submitting bookings and requests

- New `service_requests` table covering the non-booking flows: enquiries, support requests, cargo, get-cash, construction, real-estate — with type, subject, message, contact details, status (new / in review / approved / rejected / closed), staff notes and assignee.
- Customers submit through new forms in the portal (quick actions now open a booking/request dialog instead of a marketing link), and the public contact page saves enquiries instead of only showing a toast.
- Bookings continue to use the existing `bookings` + `booking_services` tables so history, itinerary and transfers keep working unchanged.
- Database triggers create notifications and activity records automatically: staff get notified on every new submission; the customer gets notified on every status change.

## 3. Admin review workflows

Replace the placeholder content on these existing admin routes with live, data-backed workspaces:

- **Bookings** — list, filter, open detail, approve/confirm, reject, cancel, move stage, edit notes.
- **Requests** (added to the admin menu, reusing existing nav styling) — triage enquiries, support and service requests.
- **Support, Payments, Transfers, Customers, Notifications** — wired to real rows with the actions each already implies (verify payment, assign driver, mark read, etc.).

Every destructive or status-changing action uses the existing confirmation dialog, optimistic update, toast, and writes an audit log entry.

## 4. Live dashboard cards

- Replace hardcoded KPI values with live aggregates: total / pending / confirmed bookings, open requests, payments awaiting verification, today's transfers, unread notifications, active customers.
- The customer dashboard cards read from the same live sources.
- Cards recompute automatically when the underlying rows change — no refresh, no reload.

## 5. Real-time

- Extend the realtime publication to booking_services, payments, airport_transfers, service_requests, conversations and activity_events (bookings, notifications, messages are already published).
- One shared subscription helper invalidates the relevant queries; admins get a scoped staff-wide channel, customers keep their own user-filtered channel. Channels are created and torn down per mount, so no duplicate subscriptions.

## 6. Security

- All new tables get explicit grants plus RLS: customers read/insert only their own rows; staff read and manage all rows through `is_staff`; only super admin can change roles.
- Status changes are restricted to staff at the database level, so approving cannot be forced from the browser.
- The public contact form writes enquiries through a narrow server-side path rather than a broad anonymous write policy.

## 7. Testing

Drive the full loop in a browser before finishing: customer submits a booking and a request, admin sees both appear live with counts updating, admin approves one and rejects one, customer sees status and notification change live — all without a reload. Check the build and console for errors at the end.

## Technical notes

- Migrations: `service_requests` (+ grants, RLS, updated_at trigger), notification/activity triggers on bookings and service_requests, super-admin claim function, realtime publication additions.
- Frontend: extend `src/hooks/usePortal.ts` and add `src/hooks/useAdminData.ts`; new `useRealtimeInvalidate` helper; new booking/request dialog components under `src/components/portal/`; admin tables built on the existing `AdminUI` kit so branding and responsiveness stay identical.
- `src/routes/_authenticated/admin/$module.tsx` keeps handling the remaining placeholder modules; only the modules listed above graduate to dedicated route files.
