# Blockbuster Theatre Website

Blockbuster Theatre is a responsive cinema website built with React and Vite. Its dark, cinema-inspired interface uses movie artwork, bold red accents, and reusable layouts across desktop and mobile.

> **Demo project:** The booking flow can create unpaid reservations through the configured backend. It does not collect card details or process payments. The contact form is a demonstration.

## Features

- Home page with a featured-film carousel, What's On, Top Picks, and special offers
- Now Showing catalogue with title search, genre filters, sorting, and collections
- Coming Soon listings with release countdowns
- Movie detail pages and a weekly timetable with showtimes and PDF download
- Multi-step booking for tickets, seats, guest details, and ticket preview
- Cognito sign-in, account booking history, and ticket downloads
- About page with theatre information, FAQs, and a demo contact form

## Tech Stack

- React 19, React Router, and JavaScript
- Vite for development and production builds
- CSS for shared and responsive styling
- AWS Amplify and Cognito for authentication
- jsPDF and QRCode React for timetable and ticket features
- A configured backend API for movies, offers, and bookings

## Run Locally

From the repository root:

```bash
npm install
```

Copy `.env.example` to `.env.local`, then configure:

- `VITE_MOVIES_API_URL`: the absolute HTTP(S) API base URL, including a stage path if needed. Do not append a route such as `/movies`.
- `VITE_COGNITO_REGION`: the backend region (currently `eu-west-2`).
- `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_USER_POOL_CLIENT_ID`: the backend stack's `UserPoolId` and `UserPoolClientId` outputs.
- `VITE_CONFIG_URL`: the URL of the site's hosted configuration JSON. If omitted locally, the site uses its fallback configuration.

The Cognito IDs are public identifiers; the public app client must not have a client secret. Mode-specific `.env.development.local` and `.env.production.local` files are also supported. Restart the Vite server after changing environment values.

Start the development server:

```bash
npm run dev
```

The API base URL is written to the gitignored `src/config.js` before development and production builds; `VITE_MOVIES_API_URL` is required and has no hardcoded fallback.

To run tests, lint, or build:

```bash
npm test
npm run lint
npm run build
```

### GitHub Pages

Set `VITE_MOVIES_API_URL`, `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_USER_POOL_CLIENT_ID`, and `VITE_CONFIG_URL` as repository Actions variables under **Settings > Secrets and variables > Actions > Variables**. The deployment workflow validates these values and supplies them to the production build.

## Accounts and Authentication

The Login page signs in with Cognito using Amplify's SRP flow. Sign Up creates accounts with email, `given_name`, and `family_name`, and confirms the email with a Cognito verification code when required. MFA codes and required-new-password challenges are supported; other account recovery or setup steps direct users to the theatre administrator.

Amplify manages the session, and authenticated frontend API requests use its access token as a bearer token. After signing in, users are redirected to My Account; signed-in users visiting Login are also redirected there. My Account shows the profile, upcoming bookings, and booking history. It requires the backend's authenticated `GET /api/v1/bookings/account/history` endpoint and only shows bookings linked to the account, including converted guest bookings. Newly linked bookings may take a short time to appear.

Booking history sends the Cognito access token. The current backend only automatically links guest bookings when it receives a verified ID token, so opening the account page does not trigger automatic linking.

The profile displays name, email, and phone claims from the Cognito ID token when available. Profile editing, password changes, and email/SMS alert preferences are placeholders, not saved settings. Booking cards load catalogue posters using `movieId` from the history endpoint and use a placeholder when artwork is unavailable. Tickets with a booking reference can be viewed on the account page; older bookings without one cannot generate a QR code.

Booking confirmations and account tickets render QR codes locally from the booking reference, matching the confirmation email. Account tickets also show guest name, ticket count, and total when available.

## Movies, Collections, and Booking

The site is a single-page app using React Router. Movie detail pages use `/movie/{slug}` or `/coming-soon/{slug}`, and collection detail pages use `/collection/{id}`. Legacy `.html` URLs redirect to their SPA routes.

Collections are a section of Now Showing, available through a page-level switch. The browse view loads `GET /collections`; each card opens `/collection/{id}`, which calls `GET /collections/{id}` and displays movie summaries in API order.

The booking flow loads typed movie and offer entries from `GET /film-selections?date=YYYY-MM-DD`, date-specific showtimes from `GET /movies/{id}?date=YYYY-MM-DD`, and server-owned ticket tiers from `GET /ticket-pricing`. The timetable combines date-specific movie lists for the next occurrence of each weekday, while the movie detail page loads schedules across the next seven days. Selecting a showtime carries its backend-generated `showtimeId`, date, and time into booking. Showtime records use `{ date, screen, time, showtimeId }`; offer overrides are requested for the selected date.

If film selections fail, the frontend falls back to available `GET /movies` records and reports that offer data is unavailable. Home-page offers come from `/film-selections`. Checkout sends the typed selection, date-derived weekday/time, and ticket quantities to `POST /checkout/validate`; the returned total is authoritative.

### Guest Booking and Account Conversion

The booking wizard keeps selection and contact data in memory and does not require a guest session or cart. It loads seat availability from `GET /api/v1/bookings/guest?showtimeId={showtimeId}&date={YYYY-MM-DD}`. To create an unpaid guest reservation, it sends `showtimeId`, `date`, `seats`, `email`, `customerName`, and ticket `{ tierId, quantity }` entries to `POST /api/v1/bookings/guest`; offer reservations also include `offerId`. Signed-in bookings use the account endpoint.

The backend response is authoritative for the total, date, seats, booking reference, and confirmation email status. Guests may skip account creation or submit a password and the response's `conversionToken` to `POST /api/v1/auth/convert-guest`; conversion tokens are never persisted in browser storage.

### Wallet Passes

Apple and Google Wallet buttons appear on the ticket preview. Pass generation is disabled by default; clicking either button displays a toast. To enable it, set `VITE_ENABLE_WALLET_PASSES=true` for the build. The existing wallet worker is used by default; set `VITE_WALLET_PASS_API_URL` to override its URL.

## Project Structure

```text
blockbuster-theatre-website/
├── README.md
├── qodana.yaml
└── 
    ├── .env.example
    ├── package.json
    ├── index.html
    ├── public/
    ├── scripts/
    ├── src/
    │   ├── App.jsx
    │   ├── auth/
    │   ├── components/
    │   ├── context/
    │   ├── styles/
    │   └── utils/
    └── tests/
```
