# Button Component Guide

The unified `Button` component provides a reusable, semantically-rich way to create buttons across the Blockbuster Theatre website. It supports multiple variants, shapes, and optional leading/trailing icons.

## Components

### `<Button />`
A standard HTML button element wrapper.

**Props:**
- `variant?: 'primary' | 'secondary' | 'glass'` — Button style variant (default: `'primary'`)
- `shape?: 'rounded' | 'pill'` — Border radius style (default: `'rounded'`)
- `leftIcon?: React.ReactNode` — Leading icon (e.g., eye, download)
- `rightIcon?: React.ReactNode` — Trailing icon (e.g., chevron, send)
- `fullWidth?: boolean` — Stretch to 100% width (default: `false`)
- `disabled?: boolean` — Disable the button (default: `false`)
- `type?: 'button' | 'submit' | 'reset'` — Button type (default: `'button'`)
- `className?: string` — Additional CSS classes
- All standard HTML button attributes (`onClick`, `aria-label`, etc.)

**Examples:**

```jsx
import { Button } from '../../shared';
import { EyeIcon, DownloadIcon, ChevronRightIcon } from '../../shared/Button/icons';

// Primary button with leading icon
<Button leftIcon={<EyeIcon />}>
  View Ticket
</Button>

// Secondary pill button with download icon
<Button variant="secondary" shape="pill" leftIcon={<DownloadIcon />}>
  Download
</Button>

// Full-width form submit button
<Button fullWidth type="submit">
  Send Message
</Button>

// Disabled state
<Button disabled>
  Save Changes
</Button>
```

### `<ButtonLink />`
A link-variant of Button for use with React Router `<Link>` or standard `<a>` elements.

**Props:**
- `as?: React.ElementType` — Component to render (default: `'a'`)
- All `Button` props (variant, shape, icons, etc.)
- All standard link/anchor attributes (`href`, `to`, `aria-label`, etc.)

**Examples:**

```jsx
import { ButtonLink } from '../../shared';
import { ChevronRightIcon } from '../../shared/Button/icons';

// Standard anchor link
<ButtonLink href="/now-showing" rightIcon={<ChevronRightIcon />}>
  View All Movies
</ButtonLink>

// React Router Link
import { Link } from 'react-router-dom';
<ButtonLink as={Link} to="/collection" variant="glass">
  Explore Collection
</ButtonLink>
```

## Icon Components

Pre-built SVG icons available in `/Button/icons.jsx`:

- `EyeIcon` — View/visibility action (View Ticket)
- `DownloadIcon` — Download action (Download Ticket)
- `ChevronRightIcon` — Forward/navigation (View All)
- `SendIcon` — Submit/send action (Send Message)
- `CheckIcon` — Confirmation/success (selected state)

All icons use `currentColor` and 2.5px stroke width to match button typography.

**Custom Icons:**
To add your own icon, provide any React component that renders an `<svg>` with:
- `fill="none"` and `stroke="currentColor"` (or just `fill="currentColor"` for solid)
- `strokeWidth="2.5"` (if stroked)
- `aria-hidden="true"` and `focusable="false"` (semantic)

```jsx
function CustomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="..." stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

<Button rightIcon={<CustomIcon />}>Action</Button>
```

## Styling & CSS Classes

The component uses CSS Modules with the following structure:

- `.button` — Base button styles
- `.variant-{primary,secondary,glass}` — Visual variants
- `.shape-{rounded,pill}` — Border radius
- `.iconLeft`, `.iconRight` — Icon containers
- `.fullWidth` — Full-width modifier

All styling is scoped to the Button component module and does not conflict with site-wide styles.

## Refactored Components

The following components have been updated to use the new Button component:

### Account Page (`src/components/pages/account/Account.jsx`)
- **Log out button** → `<Button variant="secondary" shape="pill">Log out</Button>`
- **Save changes** → `<Button variant="secondary" shape="pill" disabled>Save changes</Button>`
- **Change password** → `<Button variant="secondary" shape="pill" disabled>Change password</Button>`
- **View Ticket** → `<Button variant="primary" shape="pill" leftIcon={<EyeIcon />}>View ticket</Button>`
- **Download Ticket** → `<Button variant="secondary" shape="pill" leftIcon={<DownloadIcon />}>Download ticket</Button>`

### TicketDownloadButton (`src/components/shared/TicketDownloadButton/TicketDownloadButton.jsx`)
- Refactored to use `<Button>` with download icon
- Maintains all existing functionality and error handling

### MovieSection (`src/components/pages/home/MovieSection.jsx`)
- **View All Movies** → `<ButtonLink variant="glass" rightIcon={<ChevronRightIcon />}>View All Movies</ButtonLink>`

## Design System Alignment

- **Typography:** Uppercase, bold, display font (Oswald)
- **Colors:**
  - Primary: Red gradient (coral to dark red) with glow
  - Secondary: Dark charcoal with subtle border
  - Glass: Blurred backdrop effect with light border
- **Spacing:** Tight gap between icon and text (0.375rem / 6px)
- **Interactive States:**
  - Hover: Subtle lift + color brighten (primary), border color change (secondary)
  - Focus: Red outline with 3px offset
  - Disabled: 60% opacity, cursor not-allowed
- **Responsive:** Font size and padding scale with viewport via `clamp()`

## Migration Path

To migrate an existing button to the new component:

1. Import `Button` (or `ButtonLink`) from `'../../shared'`
2. Identify the intended variant and shape:
   - Red fill → `variant="primary"`
   - Dark charcoal → `variant="secondary"`
   - Glass/transparent → `variant="glass"`
   - Large radius → `shape="pill"` (or `"rounded"` for tighter radius)
3. Add semantic leading/trailing icons if applicable
4. Remove old button-specific CSS classes or modules
5. Test hover, focus, and disabled states in browser

## Browser Support

All components use standard HTML button/anchor elements and modern CSS:
- Flexbox layout
- CSS custom properties (CSS Variables)
- CSS `backdrop-filter` for glass variant (graceful fallback in older browsers)
- Focus-visible for keyboard users
- Touch-action optimizations for mobile

No JavaScript event polyfills required.
