# React + Vite

## Movies API

The movies API base URL is written to the gitignored `src/config.js` before each development server start and production build. `VITE_MOVIES_API_URL` is required; there is no hardcoded URL fallback.

For local development, copy `.env.example` to `.env.local` and set `VITE_MOVIES_API_URL` to the API invoke base URL. Include a stage path if the API uses one, but do not append a route such as `/movies`. You can also use mode-specific `.env.development.local` and `.env.production.local` files. For GitHub Pages deployments, add a repository Actions variable named `VITE_MOVIES_API_URL` under Settings → Secrets and variables → Actions → Variables. The deployment workflow requires this variable and passes it into the production build.

The booking flow loads typed movie and offer entries from `GET /film-selections`, movie showtimes from `GET /movies/{id}`, and server-owned ticket tiers from `GET /ticket-pricing`. If film selections fail, it falls back to available records from `GET /movies` and reports that offer data is unavailable. The home-page offers are loaded from the offer entries in `/film-selections`. Checkout sends only the selected typed ID, showtime, and ticket quantities to `POST /checkout/validate`; the returned total is authoritative. A non-empty offer `overrideShowtimes` map is authoritative. If it is empty or missing, the frontend loads the featured movie's schedule; when present, override days with no entries do not fall back to the movie schedule.

## Browser support

The production build includes a legacy bundle targeting iOS Safari 10 and polyfills for older JavaScript and fetch support. Older Safari versions may display layouts differently where CSS Grid or newer CSS sizing features are unavailable.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
