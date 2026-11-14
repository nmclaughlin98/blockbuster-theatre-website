# React + Vite

## Movies API

The movies API base URL is written to the gitignored `src/config.js` before each development server start and production build. `VITE_MOVIES_API_URL` is required; there is no hardcoded URL fallback.

For local development, copy `.env.example` to `.env.local`. Set `VITE_MOVIES_API_URL` to the API invoke base URL, including a stage path if the API uses one, but do not append a route such as `/movies`. Set `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, and `VITE_COGNITO_USER_POOL_CLIENT_ID` using the backend stack's region and `UserPoolId` / `UserPoolClientId` outputs. The current backend region is `eu-west-2`. The public app client must have no client secret. You can also use mode-specific `.env.development.local` and `.env.production.local` files. For GitHub Pages deployments, add all four `VITE_...` values as repository Actions variables under Settings → Secrets and variables → Actions → Variables; the deploy workflow validates and passes them into the production build.

The Login page signs in with Cognito using Amplify's SRP flow. The Sign Up page creates accounts with email, `given_name`, and `family_name` attributes and confirms the email address with Cognito's verification code when required. Amplify manages the session; frontend API requests use its access token as a bearer token. MFA verification codes and Cognito's required-new-password challenge are supported; other account recovery/setup steps direct users to the theatre administrator.

Signed-in users can open My Account from the header to see their name, upcoming bookings and booking history, or log out. Booking history requires the backend's authenticated `GET /api/v1/bookings/account/history` endpoint; deploy that backend change before using the page. Only bookings linked to the account, including converted guest bookings, are shown. Newly linked bookings may take a short time to appear.

## Wallet passes

Apple and Google Wallet buttons are shown on the demo ticket preview. Pass generation is disabled by default; clicking either button displays a toast. To enable generation, set `VITE_ENABLE_WALLET_PASSES=true` for the build. The existing wallet worker is used by default; set `VITE_WALLET_PASS_API_URL` to override its URL. For GitHub Pages, configure these as repository Actions variables.

The booking flow loads typed movie and offer entries from `GET /film-selections?date=YYYY-MM-DD`, movie showtimes from `GET /movies/{id}?date=YYYY-MM-DD`, and server-owned ticket tiers from `GET /ticket-pricing`. The timetable retains its weekly weekday-tab layout and combines date-specific movie lists for the next occurrence of each weekday; each showtime link carries that backend record's `date`, `time`, and exact `showtimeId` into booking instead of using a weekday identifier. The movie detail page retains its weekday-grouped showtime layout and loads date-specific schedules across the next seven days; selecting a showtime and continuing to booking carries its exact date, time, and ID. Date-specific showtime records use `{ date, screen, time, showtimeId }`; IDs are backend-generated and retained with their selected date. Offer overrides are also requested for the selected date. If film selections fail, the frontend falls back to available records from `GET /movies` and reports that offer data is unavailable. The home-page offers are loaded from the offer entries in `/film-selections`. Checkout sends the selected typed ID, date-derived weekday/time, and ticket quantities to `POST /checkout/validate`; the returned total is authoritative.

### Guest booking and account conversion

The booking wizard keeps selection and contact data in memory and does not require a guest session or cart. It loads availability from `GET /api/v1/bookings/guest?showtimeId={showtimeId}&date={YYYY-MM-DD}`. To create an unpaid reservation, it sends `showtimeId`, `date`, `seats`, `email`, `customerName`, and ticket `{ tierId, quantity }` entries to `POST /api/v1/bookings/guest`; offer reservations also include `offerId`. It sends no payment token and collects no card details. The backend response is authoritative for the total, date, seats, booking reference, and confirmation email status. Guests may skip account creation or submit a password and the response's `conversionToken` to `POST /api/v1/auth/convert-guest`; conversion tokens are never persisted in browser storage.

## Movie Collections

Collections is a section of Now Showing, available through an animated page-level switch rather than the primary navigation. The browse view loads collection cards from `GET /collections`; each card opens `collection.html?collection={id}`. The detail page calls `GET /collections/{id}` and displays the available movie summaries in the order returned by the API.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
