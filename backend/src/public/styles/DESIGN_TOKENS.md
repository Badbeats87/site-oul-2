# Design System Tokens

Complete reference for all design tokens used in the Vinyl Catalog application.

## Overview

Design tokens are the visual building blocks of the design system. They define color, typography, spacing, sizing, and other properties that ensure consistency across all pages and components.

All tokens are defined as CSS custom properties (CSS variables) in `design-system.css` and can be used throughout the application.

---

## Color Tokens

### Semantic Colors

Used for primary application interactions and general-purpose styling.

| Token                 | Value     | Use Case                            |
| --------------------- | --------- | ----------------------------------- |
| `--color-primary`     | `#1a1a1a` | Main dark color, text, buttons      |
| `--color-secondary`   | `#f5f5f5` | Light backgrounds, alternating rows |
| `--color-accent`      | `#2563eb` | Links, active states, focus         |
| `--color-accent-dark` | `#1e40af` | Accent hover state                  |
| `--color-success`     | `#059669` | Success messages, positive actions  |
| `--color-warning`     | `#d97706` | Warning messages, caution alerts    |
| `--color-danger`      | `#dc2626` | Destructive actions, errors         |
| `--color-info`        | `#2563eb` | Informational content               |
| `--color-text`        | `#1f2937` | Primary text content                |
| `--color-text-light`  | `#6b7280` | Secondary text, labels              |
| `--color-border`      | `#e5e7eb` | Dividers, table borders             |
| `--color-bg`          | `#ffffff` | Page background                     |

### Status Colors

Used for inventory and submission status indicators.

| Token                        | Value     | Use Case                             |
| ---------------------------- | --------- | ------------------------------------ |
| `--color-status-live`        | `#059669` | LIVE inventory status text           |
| `--color-status-live-bg`     | `#d1fae5` | LIVE inventory status background     |
| `--color-status-sold`        | `#4b5563` | SOLD inventory status text           |
| `--color-status-sold-bg`     | `#f3f4f6` | SOLD inventory status background     |
| `--color-status-reserved`    | `#92400e` | RESERVED inventory status text       |
| `--color-status-reserved-bg` | `#fef3c7` | RESERVED inventory status background |

### Neutral Color Scale

Extended grayscale for flexible styling.

| Token                 | Value     | Use Case                |
| --------------------- | --------- | ----------------------- |
| `--color-neutral-50`  | `#f9fafb` | Lightest backgrounds    |
| `--color-neutral-100` | `#f3f4f6` | Light backgrounds       |
| `--color-neutral-200` | `#e5e7eb` | Light borders, dividers |
| `--color-neutral-300` | `#d1d5db` | Medium-light borders    |
| `--color-neutral-400` | `#9ca3af` | Placeholder text        |
| `--color-neutral-500` | `#6b7280` | Secondary text          |
| `--color-neutral-600` | `#4b5563` | Muted text              |
| `--color-neutral-700` | `#374151` | Dark text               |
| `--color-neutral-800` | `#1f2937` | Darker text             |
| `--color-neutral-900` | `#111827` | Darkest text            |

### State Colors

Colors for disabled and interactive states.

| Token                 | Value     | Use Case                     |
| --------------------- | --------- | ---------------------------- |
| `--color-disabled`    | `#d1d5db` | Disabled element borders     |
| `--color-disabled-bg` | `#f3f4f6` | Disabled element backgrounds |

---

## Typography Tokens

### Font Families

| Token                | Value                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `--font-family-base` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |
| `--font-family-mono` | `'Monaco', 'Courier New', monospace`                                                         |

### Font Weights

| Token                    | Value | Use Case                           |
| ------------------------ | ----- | ---------------------------------- |
| `--font-weight-light`    | `300` | Secondary text, supporting content |
| `--font-weight-regular`  | `400` | Body text, paragraphs              |
| `--font-weight-medium`   | `500` | Labels, buttons                    |
| `--font-weight-semibold` | `600` | Headings, emphasized text          |
| `--font-weight-bold`     | `700` | Strong emphasis, display text      |

### Font Sizes

| Token              | Value (rem) | Value (px) | Use Case                   |
| ------------------ | ----------- | ---------- | -------------------------- |
| `--font-size-xs`   | `0.75rem`   | `12px`     | Caption, small helper text |
| `--font-size-sm`   | `0.875rem`  | `14px`     | Labels, small text         |
| `--font-size-base` | `1rem`      | `16px`     | Body text                  |
| `--font-size-lg`   | `1.125rem`  | `18px`     | Button text                |
| `--font-size-xl`   | `1.25rem`   | `20px`     | Subheading                 |
| `--font-size-2xl`  | `1.5rem`    | `24px`     | Heading (h4, h5)           |
| `--font-size-3xl`  | `1.875rem`  | `30px`     | Heading (h2, h3)           |
| `--font-size-4xl`  | `2.25rem`   | `36px`     | Heading (h1)               |
| `--font-size-5xl`  | `3rem`      | `48px`     | Display heading            |

### Line Height

| Token                   | Value  | Use Case           |
| ----------------------- | ------ | ------------------ |
| `--line-height-tight`   | `1.2`  | Headings           |
| `--line-height-normal`  | `1.5`  | Subtext, labels    |
| `--line-height-relaxed` | `1.75` | Long-form content  |
| `--line-height-base`    | `1.6`  | Standard body text |

### Letter Spacing

| Token                     | Value     | Use Case               |
| ------------------------- | --------- | ---------------------- |
| `--letter-spacing-tight`  | `-0.02em` | Headings, display text |
| `--letter-spacing-normal` | `0`       | Standard text          |
| `--letter-spacing-wide`   | `0.02em`  | Labels, caps           |

---

## Spacing Tokens

The 8-step spacing scale is based on an 8px grid for consistent alignment.

| Token         | Value (rem) | Value (px) | Use Case            |
| ------------- | ----------- | ---------- | ------------------- |
| `--space-xs`  | `0.25rem`   | `4px`      | Tight spacing       |
| `--space-sm`  | `0.5rem`    | `8px`      | Small gaps          |
| `--space-md`  | `1rem`      | `16px`     | Default spacing     |
| `--space-lg`  | `1.5rem`    | `24px`     | Comfortable spacing |
| `--space-xl`  | `2rem`      | `32px`     | Section spacing     |
| `--space-2xl` | `3rem`      | `48px`     | Large sections      |
| `--space-3xl` | `4rem`      | `64px`     | Extra large spacing |
| `--space-4xl` | `6rem`      | `96px`     | Page margins        |

### Spacing Guidelines

- **Padding**: Use for internal spacing within components
- **Margin**: Use for spacing between components
- **Gap**: Use for spacing within flexbox/grid containers

---

## Border Radius Tokens

| Token           | Value    | Use Case               |
| --------------- | -------- | ---------------------- |
| `--radius-none` | `0`      | Sharp corners          |
| `--radius-sm`   | `4px`    | Badges, small elements |
| `--radius-md`   | `8px`    | Buttons, inputs, cards |
| `--radius-lg`   | `12px`   | Large cards, modals    |
| `--radius-xl`   | `16px`   | Extra-large cards      |
| `--radius-full` | `9999px` | Circles, pills         |

---

## Shadow Tokens

Shadows create depth and hierarchy. Use them sparingly.

| Token           | Value                              | Elevation | Use Case                           |
| --------------- | ---------------------------------- | --------- | ---------------------------------- |
| `--shadow-none` | `0 0 0 0 transparent`              | None      | Remove shadows                     |
| `--shadow-sm`   | `0 1px 2px 0 rgba(0,0,0,0.05)`     | 1         | Subtle shadows, flat cards         |
| `--shadow-md`   | `0 4px 6px -1px rgba(0,0,0,0.1)`   | 2         | Hover states, interactive elements |
| `--shadow-lg`   | `0 10px 15px -3px rgba(0,0,0,0.1)` | 3         | Raised cards, dropdowns            |
| `--shadow-xl`   | `0 20px 25px -5px rgba(0,0,0,0.1)` | 4         | Modals, overlays                   |

---

## Focus State Tokens

Accessible focus indicators for keyboard navigation.

| Token                    | Value                           | Use Case             |
| ------------------------ | ------------------------------- | -------------------- |
| `--focus-outline-color`  | `#2563eb`                       | Focus outline color  |
| `--focus-outline-width`  | `2px`                           | Focus outline width  |
| `--focus-outline-offset` | `2px`                           | Focus outline offset |
| `--focus-shadow`         | `0 0 0 3px rgba(37,99,235,0.1)` | Focus glow effect    |

**Implementation**:

```css
input:focus {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  outline-offset: var(--focus-outline-offset);
  box-shadow: var(--focus-shadow);
}
```

---

## State Opacity Tokens

Control opacity for interactive states.

| Token                      | Value  | Use Case             |
| -------------------------- | ------ | -------------------- |
| `--state-opacity-hover`    | `0.85` | Hover state opacity  |
| `--state-opacity-active`   | `0.75` | Active/pressed state |
| `--state-opacity-disabled` | `0.5`  | Disabled state       |

---

## Transition Tokens

Timing functions for animations and transitions.

| Token               | Value                                | Speed | Use Case            |
| ------------------- | ------------------------------------ | ----- | ------------------- |
| `--transition-fast` | `150ms cubic-bezier(0.4, 0, 0.2, 1)` | 150ms | Quick interactions  |
| `--transition-base` | `250ms cubic-bezier(0.4, 0, 0.2, 1)` | 250ms | Standard animations |
| `--transition-slow` | `350ms cubic-bezier(0.4, 0, 0.2, 1)` | 350ms | Entrance animations |

The cubic-bezier curve is the Material Design standard easing function.

---

## Z-Index Scale

Manage stacking context with a clear hierarchy.

| Token          | Value  | Use Case                |
| -------------- | ------ | ----------------------- |
| `--z-hide`     | `-1`   | Hidden elements         |
| `--z-base`     | `0`    | Default/auto stacking   |
| `--z-sticky`   | `50`   | Sticky table headers    |
| `--z-navbar`   | `75`   | Navigation bar          |
| `--z-dropdown` | `100`  | Dropdowns, popovers     |
| `--z-modal`    | `1000` | Modal dialogs           |
| `--z-tooltip`  | `1100` | Tooltips (above modals) |
| `--z-loading`  | `2000` | Loading overlays        |

---

## Responsive Breakpoints

Mobile-first responsive design breakpoints.

| Token             | Value    | Device       | Use Case                  |
| ----------------- | -------- | ------------ | ------------------------- |
| `--breakpoint-xs` | `320px`  | Small phone  | Base mobile styles        |
| `--breakpoint-sm` | `480px`  | Phone        | Small phone optimizations |
| `--breakpoint-md` | `768px`  | Tablet       | Tablet layouts            |
| `--breakpoint-lg` | `1024px` | Desktop      | Desktop layouts           |
| `--breakpoint-xl` | `1280px` | Large screen | Large screen layouts      |

**Usage in media queries**:

```css
/* Mobile-first approach */
.component {
  /* Mobile (320px+) styles */
}

@media (min-width: 480px) {
  .component {
    /* Tablet styles */
  }
}

@media (min-width: 768px) {
  .component {
    /* Desktop styles */
  }
}
```

---

## Animation Tokens

Pre-defined animations for consistent motion.

### Available Animations

| Animation | Duration            | Use Case                  |
| --------- | ------------------- | ------------------------- |
| `slideIn` | `--transition-base` | Content entrance          |
| `fadeIn`  | `--transition-base` | Fade entrance             |
| `fadeOut` | `--transition-base` | Fade exit                 |
| `spin`    | `0.8s linear`       | Loading indicator         |
| `pulse`   | `2s infinite`       | Attention, live indicator |
| `shimmer` | `2s infinite`       | Loading skeleton          |

**Usage**:

```css
.loading-spinner {
  animation: spin 0.8s linear infinite;
}

.alert {
  animation: slideIn var(--transition-base);
}
```

### Reduced Motion Support

Respects user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Usage Examples

### Complete Button Styling

```css
.button {
  background: var(--color-primary);
  color: white;
  padding: var(--space-md) var(--space-xl);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.button:hover {
  opacity: var(--state-opacity-hover);
  box-shadow: var(--shadow-md);
}

.button:active {
  opacity: var(--state-opacity-active);
}

.button:disabled {
  opacity: var(--state-opacity-disabled);
  cursor: not-allowed;
}

.button:focus {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  box-shadow: var(--focus-shadow);
}
```

### Form Input Styling

```css
input {
  padding: var(--space-md);
  font-size: var(--font-size-base);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

input:focus {
  border-color: var(--color-accent);
  box-shadow: var(--focus-shadow);
}

input:disabled {
  background: var(--color-disabled-bg);
  color: var(--color-disabled);
  cursor: not-allowed;
}
```

### Card Component

```css
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-lg);
}
```

### Responsive Layout

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xl);
}

@media (max-width: var(--breakpoint-lg)) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: var(--breakpoint-md)) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Token Organization

Tokens are organized by category in `design-system.css`:

1. CSS Custom Properties (all tokens)
2. Reset & Base Styles
3. Typography
4. Layout
5. Buttons
6. Forms
7. Cards
8. Tables
9. Badges & Tags
10. Alerts
11. Navigation
12. Footer
13. Grid Layouts
14. Utilities
15. Animations & Keyframes
16. Responsive Design

---

## Best Practices

### DO

- ✅ Use tokens consistently across all components
- ✅ Reference tokens in CSS, not hardcoded values
- ✅ Follow mobile-first responsive design
- ✅ Test focus states for accessibility
- ✅ Respect prefers-reduced-motion
- ✅ Use semantic color tokens for meaning
- ✅ Combine tokens (e.g., spacing + radius)

### DON'T

- ❌ Use hardcoded pixel values
- ❌ Override tokens in component files
- ❌ Create new colors without token
- ❌ Ignore responsive breakpoints
- ❌ Skip focus states
- ❌ Use overly complex calculations

---

## Token Export

All tokens can be exported in various formats:

### CSS Variables (Current)

Available in `design-system.css` and automatically in all pages.

### JSON Export

```json
{
  "color": {
    "primary": "#1a1a1a",
    "accent": "#2563eb"
  },
  "space": {
    "md": "1rem",
    "lg": "1.5rem"
  }
}
```

### SCSS Mixins (Future)

Can be generated from token definitions for additional flexibility.

---

## Accessibility Compliance

### Color Contrast

All semantic colors meet WCAG AA standards:

- Text on backgrounds: 4.5:1 minimum
- UI components: 3:1 minimum

### Focus Indicators

- Always visible on keyboard navigation
- Sufficient contrast: 3:1 minimum
- At least 3px offset

### Motion

Respects `prefers-reduced-motion` media query for users sensitive to animations.

---

## Version History

| Version | Date       | Changes                             |
| ------- | ---------- | ----------------------------------- |
| 1.0     | 2025-11-30 | Initial design system documentation |

---

## Questions & Support

For questions about design tokens, refer to:

- `design-system.css` - Source of truth
- Component-specific CSS files - Usage examples
- This document - Comprehensive reference
