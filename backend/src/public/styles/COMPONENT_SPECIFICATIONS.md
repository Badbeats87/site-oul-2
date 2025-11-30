# Component Specifications

Complete reference for all UI components in the Vinyl Catalog design system, including sizing, spacing, variants, and usage guidelines.

---

## Button Component

### Base Button `.button`

**Purpose**: Primary interactive element for user actions

**Padding**: `--space-md` (vertical) × `--space-xl` (horizontal)

```css
padding: var(--space-md) var(--space-xl);
```

**Font**:

- Size: `--font-size-base` (1rem / 16px)
- Weight: `--font-weight-medium` (500)

**Border Radius**: `--radius-md` (8px)

**Transition**: `all var(--transition-fast)` (150ms)

**Minimum Touch Target**: 44px × 44px

### Button Variants

#### Semantic Colors

| Class                | Background                  | Color             | Use Case            |
| -------------------- | --------------------------- | ----------------- | ------------------- |
| `.button--primary`   | `--color-primary` (#1a1a1a) | white             | Main actions        |
| `.button--secondary` | transparent                 | `--color-primary` | Alternative actions |
| `.button--accent`    | `--color-accent` (#2563eb)  | white             | Highlighted actions |
| `.button--success`   | `--color-success` (#059669) | white             | Positive actions    |
| `.button--danger`    | `--color-danger` (#dc2626)  | white             | Destructive actions |

#### Size Variants

| Class                             | Padding                      | Font Size                 | Use Case          |
| --------------------------------- | ---------------------------- | ------------------------- | ----------------- |
| `.button--sm`                     | `--space-sm` × `--space-md`  | `--font-size-sm` (14px)   | Compact layouts   |
| `.button` (default)               | `--space-md` × `--space-xl`  | `--font-size-base` (16px) | Standard buttons  |
| `.button--lg` or `.button--large` | `--space-lg` × `--space-2xl` | `--font-size-lg` (18px)   | Prominent actions |

#### Block Button

| Class            | Width | Display |
| ---------------- | ----- | ------- |
| `.button--block` | 100%  | `flex`  |

### Button States

**Hover** (not disabled):

- Opacity: `--state-opacity-hover` (0.85)
- Shadow: `--shadow-md`

**Active** (pressed):

- Opacity: `--state-opacity-active` (0.75)

**Disabled**:

- Opacity: `--state-opacity-disabled` (0.5)
- Cursor: `not-allowed`

**Focus**:

- Outline: `--focus-outline-width` solid `--focus-outline-color`
- Box-shadow: `--focus-shadow`

### Usage Example

```html
<!-- Primary action -->
<button class="button button--primary">Save Changes</button>

<!-- Secondary action -->
<button class="button button--secondary">Cancel</button>

<!-- Small compact button -->
<button class="button button--sm button--accent">Edit</button>

<!-- Large block button -->
<button class="button button--lg button--success button--block">
  Submit Form
</button>

<!-- Disabled button -->
<button class="button button--primary" disabled>Processing...</button>
```

---

## Form Components

### Form Group `.form-group`

**Purpose**: Container for grouped form elements

**Margin**:

- Bottom: `--space-xl` (2rem / 32px)
- Last child: 0

**Nesting**: Supports multiple form groups in a form

### Form Label `label`

**Display**: `block`

**Margin Bottom**: `--space-sm` (0.5rem / 8px)

**Font**:

- Weight: `--font-weight-medium` (500)
- Size: `--font-size-sm` (0.875rem / 14px)

**Color**: `--color-text`

### Form Inputs

All input types: `text`, `email`, `password`, `number`, `date`, `tel`, `select`, `textarea`

**Width**: 100%

**Padding**: `--space-md` (1rem / 16px)

**Font**:

- Size: `--font-size-base` (1rem / 16px) - prevents iOS auto-zoom
- Family: `--font-family-base`

**Border**:

- Width: 1px
- Color: `--color-border`
- Radius: `--radius-md` (8px)

**Background**: `--color-bg`

**Color**: `--color-text`

**Placeholder Color**: `--color-text-light`

### Form Input States

**Focus**:

- Border Color: `--color-accent`
- Box Shadow: `--focus-shadow`
- Outline: none

**Disabled**:

- Background: `--color-secondary`
- Color: `--color-text-light`
- Cursor: `not-allowed`
- Opacity: `--state-opacity-disabled`

### Textarea

**Min Height**: 120px (4 rows approx)

**Resize**: vertical only

### Select Dropdown

**Appearance**: Custom styling (removes default browser appearance)

**Background Image**: Custom chevron SVG

**Padding Right**: `--space-2xl` (2rem) for icon space

**Custom Chevron**:

```css
background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231f2937' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
background-repeat: no-repeat;
background-position: right var(--space-md) center;
```

### Form Row `.form-row`

**Display**: CSS Grid

**Grid Columns** (default): 2 columns (1fr 1fr)

**Gap**: `--space-xl` (2rem / 32px)

**Responsive Behavior**:

- Mobile (< 768px): 1 column
- Desktop (768px+): 2 columns

**Full Width Variant** `.form-row.full`:

- Grid Columns: 1fr (single column)

### Usage Example

```html
<form>
  <div class="form-group">
    <label for="email">Email Address</label>
    <input type="email" id="email" placeholder="you@example.com" required />
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="first-name">First Name</label>
      <input type="text" id="first-name" placeholder="John" />
    </div>
    <div class="form-group">
      <label for="last-name">Last Name</label>
      <input type="text" id="last-name" placeholder="Doe" />
    </div>
  </div>

  <div class="form-group form-row full">
    <label for="message">Message</label>
    <textarea id="message" placeholder="Your message here..."></textarea>
  </div>

  <div class="form-group">
    <label for="category">Category</label>
    <select id="category">
      <option value="">Select a category...</option>
      <option value="music">Music</option>
      <option value="other">Other</option>
    </select>
  </div>
</form>
```

---

## Card Component

### Base Card `.card`

**Purpose**: Container for grouped content

**Background**: `--color-bg` (white)

**Border**: 1px solid `--color-border`

**Border Radius**: `--radius-lg` (12px)

**Padding**: `--space-xl` (2rem / 32px)

**Transition**: `all var(--transition-base)` (250ms)

**Box Shadow**: `--shadow-sm`

### Card Hover State

**Border Color**: `--color-accent`

**Box Shadow**: `--shadow-lg`

### Card Variants

#### Flat Card `.card--flat`

**Border**: none

**Box Shadow**: `--shadow-sm`

**Purpose**: Subtle, minimal emphasis

#### Elevated Card `.card--elevated`

**Box Shadow**: `--shadow-xl`

**Purpose**: High emphasis, prominent content

### Card Sections

#### Card Header `.card-header`

**Font Size**: `--font-size-lg` (1.125rem / 18px)

**Font Weight**: `--font-weight-semibold` (600)

**Margin Bottom**: `--space-lg` (1.5rem / 24px)

**Padding Bottom**: `--space-lg`

**Border Bottom**: 1px solid `--color-border`

#### Card Body `.card-body`

**Font Size**: `--font-size-base` (1rem / 16px)

**Padding**: Inherits from `.card` or self-contained

#### Card Footer `.card-footer`

**Margin Top**: `--space-lg` (1.5rem / 24px)

**Padding Top**: `--space-lg`

**Border Top**: 1px solid `--color-border`

**Display**: flex

**Gap**: `--space-md` (1rem / 16px)

**Justify Content**: flex-end

**Purpose**: Action buttons, secondary information

### Usage Example

```html
<!-- Standard card -->
<div class="card">
  <div class="card-header">Card Title</div>
  <div class="card-body">
    <p>Card content goes here...</p>
  </div>
  <div class="card-footer">
    <button class="button button--secondary">Cancel</button>
    <button class="button button--primary">Save</button>
  </div>
</div>

<!-- Elevated card -->
<div class="card card--elevated">
  <div class="card-header">Important Information</div>
  <div class="card-body">
    <p>This content is emphasized with elevation.</p>
  </div>
</div>

<!-- Flat card -->
<div class="card card--flat">
  <div class="card-body">
    <p>Minimal, subtle card design.</p>
  </div>
</div>
```

---

## Table Component

### Base Table `.table`

**Width**: 100%

**Border Collapse**: collapse

**Margin Top**: `--space-lg` (1.5rem / 24px)

### Table Head

**Background**: `--color-secondary` (#f5f5f5)

**Position**: sticky (when used in scrollable containers)

**Top**: 0

**Z-index**: `--z-sticky` (50)

### Table Headers `th`

**Padding**: `--space-md` (vertical) × `--space-lg` (horizontal)

**Text Align**: left

**Font Weight**: `--font-weight-semibold` (600)

**Font Size**: `--font-size-sm` (0.875rem / 14px)

**Color**: `--color-text`

**Border Bottom**: 1px solid `--color-border`

### Table Cells `td`

**Padding**: `--space-md` (1rem / 16px)

**Border Bottom**: 1px solid `--color-border`

**Font Size**: `--font-size-base` (1rem / 16px)

**Color**: `--color-text`

**Vertical Align**: middle

### Table Rows

**Hover**: Background color `rgba(37, 99, 235, 0.05)`

**Alternating Rows**: Background `rgba(0, 0, 0, 0.02)` on even rows

### Usage Example

```html
<table class="table">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Column 1">Data 1</td>
      <td data-label="Column 2">Data 2</td>
      <td data-label="Actions">
        <button class="button button--sm">Edit</button>
      </td>
    </tr>
  </tbody>
</table>
```

---

## Badge Component

### Base Badge `.badge`

**Display**: inline-block

**Padding**: `--space-sm` (vertical) × `--space-md` (horizontal)

**Font Size**: `--font-size-xs` (0.75rem / 12px)

**Font Weight**: `--font-weight-semibold` (600)

**Border Radius**: `--radius-sm` (4px)

**Background**: `--color-secondary`

**Color**: `--color-text`

### Badge Variants

| Class              | Background          | Color          | Use Case         |
| ------------------ | ------------------- | -------------- | ---------------- |
| `.badge` (default) | `--color-secondary` | `--color-text` | Neutral status   |
| `.badge--primary`  | `--color-accent`    | white          | Primary status   |
| `.badge--success`  | `--color-success`   | white          | Success/approved |
| `.badge--warning`  | `--color-warning`   | white          | Warning/pending  |
| `.badge--danger`   | `--color-danger`    | white          | Error/rejected   |

### Status-Specific Badges

#### Live Status `.badge--live`

**Background**: `--color-status-live-bg` (#d1fae5)

**Color**: `--color-status-live` (#059669)

**Text**: "LIVE"

#### Sold Status `.badge--sold`

**Background**: `--color-status-sold-bg` (#f3f4f6)

**Color**: `--color-status-sold` (#4b5563)

**Text**: "SOLD"

#### Reserved Status `.badge--reserved`

**Background**: `--color-status-reserved-bg` (#fef3c7)

**Color**: `--color-status-reserved` (#92400e)

**Text**: "RESERVED"

### Usage Example

```html
<!-- Primary badge -->
<span class="badge badge--primary">NEW</span>

<!-- Success badge -->
<span class="badge badge--success">APPROVED</span>

<!-- Status badges -->
<span class="badge badge--live">LIVE</span>
<span class="badge badge--sold">SOLD</span>
<span class="badge badge--reserved">RESERVED</span>
```

---

## Alert Component

### Base Alert `.alert`

**Padding**: `--space-md` (vertical) × `--space-lg` (horizontal)

**Border Radius**: `--radius-md` (8px)

**Margin Bottom**: `--space-lg` (1.5rem / 24px)

**Display**: flex

**Align Items**: center

**Gap**: `--space-md` (1rem / 16px)

**Animation**: `slideIn var(--transition-base)`

### Alert Variants

#### Success Alert `.alert--success` or `.alert-success`

**Background**: rgba(209, 250, 229, 0.5) or #d1fae5

**Color**: #065f46

**Border**: 1px solid #a7f3d0

**Icon Color**: #10b981

#### Danger Alert `.alert--danger` or `.alert-danger`

**Background**: rgba(254, 226, 226, 0.5) or #fee2e2

**Color**: #991b1b

**Border**: 1px solid #fca5a5

**Icon Color**: #ef4444

#### Info Alert `.alert--info`

**Background**: rgba(219, 234, 254, 0.5)

**Color**: #1e40af

**Border**: 1px solid #93c5fd

#### Warning Alert `.alert--warning`

**Background**: rgba(254, 243, 199, 0.5)

**Color**: #92400e

**Border**: 1px solid #fcd34d

### Alert Sub-components

#### Alert Icon `.alert-icon`

**Font Size**: 1.25rem (20px)

**Flex Shrink**: 0

#### Alert Content `.alert-content`

**Flex**: 1

### Usage Example

```html
<!-- Success alert -->
<div class="alert alert--success">
  <span class="alert-icon">✓</span>
  <div class="alert-content">
    <strong>Success!</strong> Your changes have been saved.
  </div>
</div>

<!-- Danger alert -->
<div class="alert alert--danger">
  <span class="alert-icon">✕</span>
  <div class="alert-content">
    <strong>Error:</strong> Something went wrong. Please try again.
  </div>
</div>
```

---

## Navigation Component

### Navbar `.navbar`

**Background**: `--color-bg` (white)

**Border Bottom**: 1px solid `--color-border`

**Position**: sticky

**Top**: 0

**Z-index**: `--z-dropdown` (100)

### Navbar Container `.navbar__container`

**Max Width**: 1200px

**Margin**: 0 auto

**Padding**: 0 `--space-xl`

**Display**: flex

**Justify Content**: space-between

**Align Items**: center

**Height**: 70px

### Navbar Logo `.navbar__logo`

**Display**: flex

**Align Items**: center

**Gap**: `--space-md` (1rem / 16px)

**Font Size**: `--font-size-lg` (1.125rem / 18px)

**Font Weight**: `--font-weight-semibold` (600)

**Color**: `--color-primary`

**Text Decoration**: none

### Navbar Icon `.navbar__icon`

**Width**: 24px

**Height**: 24px

### Navbar Links `.navbar__links`

**Display**: flex

**Gap**: `--space-2xl` (3rem / 48px)

### Nav Link `.nav-link`

**Font Size**: `--font-size-base` (1rem / 16px)

**Color**: `--color-text`

**Transition**: `color var(--transition-fast)`

**Hover**: Color changes to `--color-accent`

---

## Pagination Component

### Pagination Container `.pagination`

**Display**: flex

**Align Items**: center

**Justify Content**: center

**Gap**: `--space-sm` (0.5rem / 8px)

**Margin Top**: `--space-2xl` (3rem / 48px)

**Padding**: `--space-lg` (vertical) × 0 (horizontal)

### Pagination Info `.pagination-info`

**Font Size**: `--font-size-sm` (0.875rem / 14px)

**Color**: `--color-text-light`

**Margin Right**: `--space-lg` (1.5rem / 24px)

**Format**: "Showing X-Y of Z items"

### Pagination Controls `.pagination-controls`

**Display**: flex

**Align Items**: center

**Gap**: `--space-sm` (0.5rem / 8px)

### Pagination Button `.pagination-btn`

**Min Width**: 40px

**Min Height**: 40px

**Display**: inline-flex

**Align Items**: center

**Justify Content**: center

**Padding**: `--space-xs` (vertical) × `--space-sm` (horizontal)

**Border**: 1px solid `--color-border`

**Background**: `--color-bg`

**Color**: `--color-text`

**Border Radius**: `--radius-md` (8px)

**Cursor**: pointer

**Font Size**: `--font-size-sm` (0.875rem / 14px)

**Transition**: `all var(--transition-fast)`

### Pagination Button States

**Hover** (not disabled):

- Background: `--color-secondary`
- Border Color: `--color-accent`
- Color: `--color-accent`

**Active** (current page):

- Background: `--color-accent`
- Color: white
- Border Color: `--color-accent`

**Disabled**:

- Opacity: `--state-opacity-disabled` (0.5)
- Cursor: not-allowed

---

## Loading Spinner

### Spinner `.loading-spinner`

**Display**: inline-block

**Width**: 20px

**Height**: 20px

**Border**: 3px solid rgba(37, 99, 235, 0.1)

**Border Top Color**: `--color-accent` (blue)

**Border Radius**: 50% (circle)

**Animation**: `spin 0.8s linear infinite`

### Usage Example

```html
<div class="loading-spinner"></div>
```

---

## Responsive Breakpoints

All components follow mobile-first responsive design:

| Breakpoint | Size   | Device       |
| ---------- | ------ | ------------ |
| xs         | 320px  | Small phone  |
| sm         | 480px  | Phone        |
| md         | 768px  | Tablet       |
| lg         | 1024px | Desktop      |
| xl         | 1280px | Large screen |

### Media Query Format

```css
/* Mobile-first base styles */
.component {
  /* Mobile (320px+) styles */
}

@media (min-width: 480px) {
  .component {
    /* Small phone optimizations */
  }
}

@media (min-width: 768px) {
  .component {
    /* Tablet optimizations */
  }
}

@media (min-width: 1024px) {
  .component {
    /* Desktop optimizations */
  }
}
```

---

## Accessibility Guidelines

### Minimum Touch Targets

- All interactive elements: 44px × 44px
- Buttons: Minimum 44px height
- Links: Minimum 44px height/width

### Focus States

- Always visible and distinct
- Minimum 2px outline or shadow
- Outline color: `--color-accent`
- Sufficient contrast: 3:1 minimum

### Color Contrast

- Text on backgrounds: 4.5:1 (WCAG AA)
- UI components: 3:1 (WCAG AA)

### Motion

- Respects `prefers-reduced-motion` media query
- Animations disabled for users with motion sensitivity

### Semantic HTML

- Use proper heading hierarchy (h1-h6)
- Use form labels with `for` attributes
- Use semantic buttons instead of divs
- Use ARIA attributes when necessary

---

## Best Practices

### DO

- ✅ Use design tokens (CSS variables) for all values
- ✅ Test focus states for keyboard navigation
- ✅ Test on multiple screen sizes (320px, 480px, 768px, 1024px, 1280px)
- ✅ Ensure minimum 44px touch targets
- ✅ Provide feedback for all interactive elements
- ✅ Use semantic HTML

### DON'T

- ❌ Hardcode pixel values
- ❌ Override design tokens
- ❌ Skip focus states
- ❌ Make clickable elements smaller than 44px
- ❌ Use colors without sufficient contrast
- ❌ Ignore mobile responsiveness

---

## Version History

| Version | Date       | Changes                          |
| ------- | ---------- | -------------------------------- |
| 1.0     | 2025-11-30 | Initial component specifications |
