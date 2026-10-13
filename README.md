# Blockbuster Theatre Website

Blockbuster Theatre is a responsive cinema website prototype built with React and Vite. Its dark, cinematic interface uses bold red accents, movie artwork, and reusable layouts to showcase films and theatre information across desktop and mobile screens.

> **Demo project:** Movie listings are loaded from a configurable API, but booking, payment, seat reservations, and contact submissions are front-end demonstrations only. No real orders or messages are sent.

## Features

- Home page with a featured-film carousel, “What’s On” and “Top Picks” sections, and special offers
- Now Showing catalogue with title search, genre filters, and sorting
- Coming Soon listings with release countdowns
- Movie detail pages with film information and showtimes
- Weekly timetable with day tabs, title search, and PDF download
- Multi-step booking experience for tickets, seats, guest details, payment, and ticket preview
- About page with theatre information, FAQs, and a demo contact form
- Responsive navigation and layouts for desktop and mobile

## Design

The React site has a modern, cinema-inspired visual design: near-black backgrounds, layered dark surfaces, vivid red highlights, high-contrast typography, and image-led film cards and hero sections. The layout and controls adapt for smaller screens, including a mobile navigation menu.

## Tech Stack

- React 19 and JavaScript
- Vite for local development and production builds
- CSS for shared styling and responsive layouts
- jsPDF for timetable downloads
- Movie data from the configured movies API

## Run Locally

From the repository root:

```bash
cd react-website
npm install
```

The API endpoint can be set with `VITE_MOVIES_API_URL`. The project includes an `.env.example`; copy it to `.env.local` and change the value if needed. Use the full endpoint ending in `/movies`, with no trailing slash. Restart the Vite server after changing the setting.

Start the development server:

```bash
npm run dev
```

Vite prints the local URL to open in your browser. To create a production build or run the linter:

```bash
npm run build
npm run lint
```

## Project Structure

```text
blockbuster-theatre-website/
├── README.md
├── qodana.yaml
└── react-website/
    ├── .env.example
    ├── package.json
    ├── index.html
    ├── public/
    │   └── assets/             
    └── src/
        ├── App.jsx
        ├── router.js
        ├── components/
        │   ├── movies/         
        │   ├── pages/          
        │   └── shared/         
        └── styles/            
```
