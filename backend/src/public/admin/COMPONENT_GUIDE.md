# Component Style Guide

Comprehensive reference documentation for all UI components used in the Vinyl Catalog admin dashboard.

**Status:** ✅ Issue #62 Phase 2.2 - High Priority Components Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Button Component](#button-component)
3. [Form Components](#form-components)
4. [Alerts & Notifications](#alerts--notifications)
5. [Badges & Status Indicators](#badges--status-indicators)
6. [Getting Started](#getting-started)
7. [Design System](#design-system)
8. [Accessibility](#accessibility)
9. [Contributing](#contributing)

---

## Overview

This guide documents the high-priority UI components for Phase 2.2 implementation. Each component includes:

- **Interactive showcase** - Live examples with HTML/CSS
- **Variants** - Different states and configurations
- **Usage guidelines** - When and how to use each component
- **Code examples** - Copy-paste ready HTML
- **Accessibility notes** - WCAG AA compliance information

### Component Showcase Pages

| Component | Path | Status |
|-----------|------|--------|
| Button | `/admin/components/buttons.html` | ✅ Complete |
| Form Inputs | `/admin/components/forms.html` | ✅ Complete |
| Alerts | `/admin/components/alerts.html` | ✅ Complete |
| Badges | `/admin/components/badges.html` | ✅ Complete |
| Index | `/admin/components/index.html` | ✅ Complete |

---

## Button Component

**Purpose:** Interactive element for user actions
**Location:** `/admin/components/buttons.html`

### Variants

#### Primary Button
Used for main actions and prominent call-to-actions.

```html
<button class="button button--primary">Save Changes</button>
```

**When to use:**
- Main action on page (Save, Submit, Send)
- Call-to-action that moves user forward
- Only one primary button per section

#### Secondary Button
Used for alternative actions less important than primary.

```html
<button class="button button--secondary">Cancel</button>
```

**When to use:**
- Alternative actions (Cancel, Close, Back)
- Less prominent than primary action
- Multiple secondary buttons acceptable

### Sizes

```html
<!-- Small -->
<button class="button button--sm button--primary">Small Button</button>

<!-- Default (no size modifier) -->
<button class="button button--primary">Default Button</button>

<!-- Large -->
<button class="button button--lg button--primary">Large Button</button>

<!-- Full Width -->
<button class="button button--block button--primary">Full Width Button</button>
```

### Semantic Colors

```html
<button class="button button--primary">Primary</button>
<button class="button button--accent">Accent</button>
<button class="button button--success">Success</button>
<button class="button button--warning">Warning</button>
<button class="button button--danger">Danger</button>
```

### States

```html
<!-- Default -->
<button class="button button--primary">Click Me</button>

<!-- Hover (automatic via CSS) -->
<!-- Darker background, elevated shadow -->

<!-- Focus (automatic via CSS) -->
<!-- Blue outline, accessible focus ring -->

<!-- Disabled -->
<button class="button button--primary" disabled>Disabled</button>
```

### Button Groups

```html
<div class="d-flex gap-md">
  <button class="button button--primary">Save</button>
  <button class="button button--secondary">Cancel</button>
</div>
```

### Accessibility

- ✅ Minimum 44x44px touch target
- ✅ Visible focus indicator (outline + shadow)
- ✅ Color not used alone (text conveys meaning)
- ✅ Sufficient contrast (7:1 for primary)
- ✅ Clear, descriptive text
- ✅ Disabled state visually distinct
- ✅ Keyboard accessible (Tab, Enter)

---

## Form Components

**Purpose:** Input fields and form controls for user data entry
**Location:** `/admin/components/forms.html`

### Text Input

```html
<div class="form-group">
  <label for="email">Email Address</label>
  <input type="email" id="email" placeholder="your@email.com">
  <div class="form-help">We'll never share your email.</div>
</div>
```

#### States

- **Default:** Normal input field
- **With Help Text:** Additional guidance below input
- **Error:** Red border, error message in red
- **Success:** Green border, success message in green
- **Disabled:** Gray background, not interactive

### Select Dropdown

```html
<div class="form-group">
  <label for="condition">Condition Grade</label>
  <select id="condition">
    <option>-- Select Grade --</option>
    <option>Mint (M)</option>
    <option>Near Mint (NM)</option>
    <option>Very Good (VG)</option>
  </select>
</div>
```

### Textarea

```html
<div class="form-group">
  <label for="description">Description</label>
  <textarea id="description" rows="4" placeholder="Enter description..."></textarea>
</div>
```

### Checkbox

```html
<div class="checkbox-group">
  <div class="checkbox-item">
    <input type="checkbox" id="mint">
    <label for="mint">Mint</label>
  </div>
  <div class="checkbox-item">
    <input type="checkbox" id="nm">
    <label for="nm">Near Mint</label>
  </div>
</div>
```

### Radio Button

```html
<div class="form-group">
  <label>Status</label>
  <div class="radio-group">
    <div class="radio-item">
      <input type="radio" id="live" name="status" value="live">
      <label for="live">Live</label>
    </div>
    <div class="radio-item">
      <input type="radio" id="sold" name="status" value="sold">
      <label for="sold">Sold</label>
    </div>
  </div>
</div>
```

### Form Layouts

#### Two-Column Form

```html
<div class="form-row">
  <div class="form-group">
    <label for="first">First Name</label>
    <input type="text" id="first">
  </div>
  <div class="form-group">
    <label for="last">Last Name</label>
    <input type="text" id="last">
  </div>
</div>
```

#### Inline Form

```html
<div class="form-group" style="display: flex; gap: var(--space-md);">
  <input type="email" placeholder="your@email.com" style="flex: 1;">
  <button class="button button--primary">Subscribe</button>
</div>
```

### Validation Messages

```html
<!-- Help Text -->
<div class="form-help">This will be used for your account.</div>

<!-- Error Message -->
<div class="form-group error">
  <input type="text" value="invalid@">
  <div class="form-error">Invalid email format</div>
</div>

<!-- Success Message -->
<div class="form-group success">
  <input type="text" value="johndoe">
  <div class="form-success">Username is available!</div>
</div>
```

### Accessibility

- ✅ All inputs have associated labels
- ✅ Error messages linked via aria-describedby
- ✅ Required fields marked and announced
- ✅ Keyboard navigation (Tab, Shift+Tab)
- ✅ Focus visible on all interactive elements
- ✅ Help text programmatically associated
- ✅ Color + text for success/error states

---

## Alerts & Notifications

**Purpose:** Messages to inform, warn, or confirm user actions
**Location:** `/admin/components/alerts.html`

### Alert Types

#### Success Alert

```html
<div class="alert alert-success">
  <div class="alert-icon">✓</div>
  <div class="alert-content">
    <div class="alert-title">Success!</div>
    <div class="alert-message">Your changes have been saved.</div>
  </div>
</div>
```

**Use when:**
- Action completed successfully
- User submission accepted
- Data saved or updated

#### Danger/Error Alert

```html
<div class="alert alert-danger">
  <div class="alert-icon">✕</div>
  <div class="alert-content">
    <div class="alert-title">Error</div>
    <div class="alert-message">Unable to delete this item.</div>
  </div>
</div>
```

**Use when:**
- Operation failed
- Validation errors
- Destructive action warning

#### Warning Alert

```html
<div class="alert alert-warning">
  <div class="alert-icon">⚠</div>
  <div class="alert-content">
    <div class="alert-title">Warning</div>
    <div class="alert-message">Low stock alert for this item.</div>
  </div>
</div>
```

**Use when:**
- Caution situation
- Unusual condition
- Potential problem

#### Info Alert

```html
<div class="alert alert-info">
  <div class="alert-icon">ℹ</div>
  <div class="alert-content">
    <div class="alert-title">Helpful Tip</div>
    <div class="alert-message">You can filter by condition grade.</div>
  </div>
</div>
```

**Use when:**
- Helpful information
- System tips
- Non-urgent notices

### Dismissible Alerts

```html
<div class="alert alert-success">
  <div class="alert-icon">✓</div>
  <div class="alert-content">
    <div class="alert-message">Operation completed.</div>
  </div>
  <button class="alert-close" onclick="this.parentElement.remove();">×</button>
</div>
```

### Alerts with Actions

```html
<div class="alert alert-danger">
  <div class="alert-icon">⚠</div>
  <div class="alert-content">
    <div class="alert-title">Confirm Delete</div>
    <div class="alert-message">This action cannot be undone.</div>
    <div class="alert-actions">
      <button style="background: #dc2626; color: white;">Confirm</button>
      <button>Cancel</button>
    </div>
  </div>
</div>
```

### Accessibility

- ✅ Sufficient color contrast (4.5:1)
- ✅ Not conveyed by color alone
- ✅ role="alert" for dynamic alerts
- ✅ Close button has aria-label
- ✅ Screen reader announces immediately
- ✅ Keyboard dismissible

---

## Badges & Status Indicators

**Purpose:** Small labels for status, tags, and categorization
**Location:** `/admin/components/badges.html`

### Status Badges (Inventory Domain)

```html
<span class="badge badge-live">LIVE</span>
<span class="badge badge-sold">SOLD</span>
<span class="badge badge-reserved">RESERVED</span>
```

**Use for:**
- Item status (LIVE, SOLD, RESERVED)
- Prominent in lists and cards
- Uppercase text

### Semantic Color Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-accent">Category</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-danger">Danger</span>
```

### Badge Sizes

```html
<!-- Small -->
<span class="badge badge-sm badge-accent">NEW</span>

<!-- Default -->
<span class="badge badge-accent">Featured</span>

<!-- Large -->
<span class="badge badge-lg badge-success">IN STOCK</span>
```

### Badges with Dots

```html
<span class="badge badge-live badge-dot">LIVE</span>
```

Adds a colored dot indicator to the badge.

### Badge Combinations

```html
<div style="display: flex; gap: var(--space-sm);">
  <span class="badge badge-live">LIVE</span>
  <span class="badge badge-accent">Rock</span>
  <span class="badge badge-sm badge-success">NM</span>
</div>
```

**Use when:**
- Multiple attributes to show
- Status + category + condition
- Keep to 3-4 badges maximum

### Badge on Cards

```html
<div class="badge-card">
  <div class="badge-card-content">
    <div class="badge-card-title">The Beatles - Abbey Road</div>
    <div class="badge-card-meta">Vinyl Record • Near Mint</div>
  </div>
  <span class="badge badge-live">LIVE</span>
</div>
```

### Accessibility

- ✅ Sufficient color contrast (4.5:1)
- ✅ Not conveyed by color alone
- ✅ Semantic meaning in visual design
- ✅ Text readable at all sizes
- ✅ Color-blind safe palette

---

## Getting Started

### Basic HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <!-- Import Design System -->
  <link rel="stylesheet" href="path/to/design-system.css">
  <link rel="stylesheet" href="path/to/utilities.css">
</head>
<body>
  <div class="container">
    <!-- Your components here -->
  </div>
</body>
</html>
```

### Using Components

```html
<!-- Button -->
<button class="button button--primary">Click Me</button>

<!-- Form Group -->
<div class="form-group">
  <label for="name">Name</label>
  <input type="text" id="name">
</div>

<!-- Badge -->
<span class="badge badge-accent">Featured</span>

<!-- Alert -->
<div class="alert alert-success">
  <div class="alert-icon">✓</div>
  <div class="alert-content">
    <div class="alert-message">Success!</div>
  </div>
</div>
```

### Utility Classes

Combine utility classes for quick styling:

```html
<!-- Flexbox layout -->
<div class="d-flex items-center justify-between gap-md p-lg">
  <span>Item 1</span>
  <span>Item 2</span>
</div>

<!-- Grid layout -->
<div class="d-grid grid-cols-3 grid-gap-lg">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>

<!-- Responsive padding -->
<div class="p-md md:p-lg lg:p-xl">
  Content with responsive padding
</div>
```

---

## Design System

### Design Tokens

The design system defines 100+ design tokens for consistent styling:

**Colors:**
- Primary: `#1a1a1a`
- Secondary: `#f5f5f5`
- Accent: `#2563eb`
- Success: `#059669`
- Warning: `#d97706`
- Danger: `#dc2626`

**Spacing Scale:**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

**Typography:**
- Font sizes: xs (12px) to 4xl (36px)
- Font weights: 300 to 700
- Line heights: 1.2 to 1.75

**Shadows:**
- sm, md, lg, xl, soft, elevated

**Radius:**
- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- full: 9999px (circle)

### Utility Classes

The design system includes 200+ utility classes for rapid development:

- Display: `d-block`, `d-flex`, `d-grid`, `d-none`
- Layout: `flex-row`, `flex-col`, `items-center`, `justify-between`
- Spacing: `p-lg`, `m-md`, `gap-md`, `mx-auto`
- Typography: `text-lg`, `font-semibold`, `text-center`
- Colors: `bg-primary`, `text-accent`, `border-accent`
- Effects: `shadow-lg`, `rounded-lg`, `opacity-50`
- Responsive: `md:p-lg`, `sm:d-block`

### Responsive Design

Mobile-first breakpoints:
- xs: 320px (default)
- sm: 480px
- md: 768px
- lg: 1024px
- xl: 1280px

```html
<!-- Hidden on small screens, visible on larger -->
<div class="d-none md:d-flex">Desktop content</div>

<!-- Responsive columns -->
<div class="d-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

---

## Accessibility

All components are built with accessibility in mind, targeting **WCAG AA compliance:**

### Color & Contrast

- ✅ Text contrast minimum 4.5:1
- ✅ Large text (18px+) minimum 3:1
- ✅ Focus indicators 3:1 contrast
- ✅ Not conveyed by color alone

### Keyboard Navigation

- ✅ Tab through all interactive elements
- ✅ Shift+Tab to reverse
- ✅ Enter/Space to activate buttons
- ✅ Escape to close modals
- ✅ Arrow keys for dropdowns

### Focus Management

- ✅ Visible focus indicator (outline + shadow)
- ✅ 2px outline offset
- ✅ Focus order follows DOM
- ✅ No focus traps

### Screen Reader Support

- ✅ Semantic HTML (labels, headings, lists)
- ✅ ARIA attributes where needed
- ✅ Role attributes for custom components
- ✅ Alt text for images
- ✅ Descriptive link text

### Touch Targets

- ✅ Minimum 44x44px
- ✅ Adequate spacing between targets
- ✅ Mobile-optimized layouts

---

## Contributing

### Adding New Components

To add a new component to the style guide:

1. **Create showcase HTML file** in `/admin/components/`
   - Follow the structure of existing components
   - Include demo-box, demo-label, code-block sections
   - Add accessibility notes

2. **Update index.html**
   - Add component card to grid
   - Link to new showcase page
   - Add appropriate emoji icon

3. **Update COMPONENT_GUIDE.md**
   - Add section with variants
   - Include code examples
   - Document when to use
   - List accessibility features

4. **Test thoroughly**
   - All browsers (Chrome, Firefox, Safari, Edge)
   - Mobile responsiveness
   - Keyboard navigation
   - Screen reader compatibility

5. **Document in PR description**
   - What component was added
   - Why it was needed
   - How to use it
   - Any special considerations

---

## Roadmap

### Phase 2.2 (Current)
✅ Button component
✅ Form inputs
✅ Alerts & notifications
✅ Badges & status indicators

### Phase 2.3 (Planned)
- Tables & data display
- Cards & containers
- Modals & overlays
- Pagination
- Pagination

### Phase 2.4+ (Future)
- Typography scale
- Spacing visualization
- Color palette guide
- Animation showcase
- Storybook integration

---

## Resources

- **Design System:** `/admin/styles/design-system.css`
- **Utilities Reference:** `/admin/styles/UTILITIES.md`
- **Design Tokens:** `/admin/styles/DESIGN_TOKENS.md`
- **Design System Guide:** `/admin/design-system-guide.html`
- **Component Index:** `/admin/components/index.html`

---

## Support

For questions or issues:

1. Check the component showcase page
2. Review code examples in COMPONENT_GUIDE.md
3. Check accessibility notes
4. Review design-system.css for token definitions
5. Check browser console for errors

---

## Version History

- **v1.0** - Phase 2.2 initial release
  - Button, Form, Alert, Badge components
  - 4 showcase pages
  - Full documentation
  - WCAG AA compliance

---

**Last Updated:** November 30, 2024
**Issue:** #62 - Phase 2.2 Component Style Guide
**Status:** ✅ Complete
