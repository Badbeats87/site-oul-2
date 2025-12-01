# CSS Utility Classes Reference

Complete reference for all utility classes available in `utilities.css`. These classes provide quick access to design tokens for rapid, consistent development.

## Overview

The utilities stylesheet contains 200+ ready-to-use CSS classes organized by category. Each utility class maps directly to design tokens, ensuring consistency and making maintenance simple.

**Import in your project:**

```html
<link rel="stylesheet" href="../styles/design-system.css" />
<link rel="stylesheet" href="../styles/utilities.css" />
```

---

## 1. Display & Visibility

Control element display behavior.

| Class             | CSS                     | Use Case                |
| ----------------- | ----------------------- | ----------------------- |
| `.d-block`        | `display: block`        | Block-level element     |
| `.d-inline`       | `display: inline`       | Inline element          |
| `.d-inline-block` | `display: inline-block` | Inline-block element    |
| `.d-flex`         | `display: flex`         | Flexbox container       |
| `.d-grid`         | `display: grid`         | Grid container          |
| `.d-none`         | `display: none`         | Hide element            |
| `.d-contents`     | `display: contents`     | Remove from layout flow |
| `.visible`        | `visibility: visible`   | Visible element         |
| `.invisible`      | `visibility: hidden`    | Hidden (takes up space) |
| `.opacity-0`      | `opacity: 0`            | Fully transparent       |
| `.opacity-50`     | `opacity: 0.5`          | Half transparent        |
| `.opacity-100`    | `opacity: 1`            | Fully opaque            |

---

## 2. Flexbox Layout

Control flex container and items.

### Container Properties

| Class          | CSS                      |
| -------------- | ------------------------ |
| `.flex-row`    | `flex-direction: row`    |
| `.flex-col`    | `flex-direction: column` |
| `.flex-wrap`   | `flex-wrap: wrap`        |
| `.flex-nowrap` | `flex-wrap: nowrap`      |

### Alignment

| Class            | CSS                       |
| ---------------- | ------------------------- |
| `.items-start`   | `align-items: flex-start` |
| `.items-center`  | `align-items: center`     |
| `.items-end`     | `align-items: flex-end`   |
| `.items-stretch` | `align-items: stretch`    |

### Justification

| Class              | CSS                              |
| ------------------ | -------------------------------- |
| `.justify-start`   | `justify-content: flex-start`    |
| `.justify-center`  | `justify-content: center`        |
| `.justify-end`     | `justify-content: flex-end`      |
| `.justify-between` | `justify-content: space-between` |
| `.justify-around`  | `justify-content: space-around`  |

### Gap

| Class      | Value                |
| ---------- | -------------------- |
| `.gap-xs`  | `--space-xs` (4px)   |
| `.gap-sm`  | `--space-sm` (8px)   |
| `.gap-md`  | `--space-md` (16px)  |
| `.gap-lg`  | `--space-lg` (24px)  |
| `.gap-xl`  | `--space-xl` (32px)  |
| `.gap-2xl` | `--space-2xl` (48px) |

### Example

```html
<div class="d-flex flex-row items-center justify-between gap-md">
  <span>Item 1</span>
  <span>Item 2</span>
</div>
```

---

## 3. Grid Layout

Control grid container and columns.

| Class             | Columns             |
| ----------------- | ------------------- |
| `.grid-cols-1`    | 1 column            |
| `.grid-cols-2`    | 2 columns           |
| `.grid-cols-3`    | 3 columns           |
| `.grid-cols-4`    | 4 columns           |
| `.grid-cols-auto` | Auto-fit responsive |
| `.grid-gap-md`    | `--space-md` gap    |
| `.grid-gap-lg`    | `--space-lg` gap    |

### Example

```html
<div class="d-grid grid-cols-3 grid-gap-lg">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

---

## 4. Padding (Internal Spacing)

Add padding to elements.

### All Sides

| Class    | Value         |
| -------- | ------------- |
| `.p-0`   | 0             |
| `.p-xs`  | `--space-xs`  |
| `.p-sm`  | `--space-sm`  |
| `.p-md`  | `--space-md`  |
| `.p-lg`  | `--space-lg`  |
| `.p-xl`  | `--space-xl`  |
| `.p-2xl` | `--space-2xl` |

### Horizontal

| Class    | Value                     |
| -------- | ------------------------- |
| `.px-xs` | `--space-xs` left & right |
| `.px-sm` | `--space-sm` left & right |
| `.px-md` | `--space-md` left & right |
| `.px-lg` | `--space-lg` left & right |
| `.px-xl` | `--space-xl` left & right |

### Vertical

| Class    | Value                     |
| -------- | ------------------------- |
| `.py-xs` | `--space-xs` top & bottom |
| `.py-sm` | `--space-sm` top & bottom |
| `.py-md` | `--space-md` top & bottom |
| `.py-lg` | `--space-lg` top & bottom |
| `.py-xl` | `--space-xl` top & bottom |

---

## 5. Margin (External Spacing)

Add margin to elements.

### All Sides

| Class     | Value         |
| --------- | ------------- |
| `.m-0`    | 0             |
| `.m-auto` | auto          |
| `.m-xs`   | `--space-xs`  |
| `.m-sm`   | `--space-sm`  |
| `.m-md`   | `--space-md`  |
| `.m-lg`   | `--space-lg`  |
| `.m-xl`   | `--space-xl`  |
| `.m-2xl`  | `--space-2xl` |

### Horizontal

| Class      | Value                     |
| ---------- | ------------------------- |
| `.mx-auto` | auto left & right         |
| `.mx-xs`   | `--space-xs` left & right |
| `.mx-sm`   | `--space-sm` left & right |
| `.mx-md`   | `--space-md` left & right |
| `.mx-lg`   | `--space-lg` left & right |

### Vertical

| Class    | Value                     |
| -------- | ------------------------- |
| `.my-xs` | `--space-xs` top & bottom |
| `.my-sm` | `--space-sm` top & bottom |
| `.my-md` | `--space-md` top & bottom |
| `.my-lg` | `--space-lg` top & bottom |

### Individual Sides

| Class                     | Value         |
| ------------------------- | ------------- |
| `.mt-xs` through `.mt-xl` | top margin    |
| `.mb-xs` through `.mb-xl` | bottom margin |

---

## 6. Sizing

Control width and height.

| Class         | Value  |
| ------------- | ------ |
| `.w-full`     | 100%   |
| `.w-auto`     | auto   |
| `.w-screen`   | 100vw  |
| `.h-full`     | 100%   |
| `.h-auto`     | auto   |
| `.h-screen`   | 100vh  |
| `.max-w-sm`   | 640px  |
| `.max-w-md`   | 768px  |
| `.max-w-lg`   | 1024px |
| `.max-w-xl`   | 1280px |
| `.max-w-full` | 100%   |

---

## 7. Typography

Control text styling.

### Font Size

| Class        | Value                     |
| ------------ | ------------------------- |
| `.text-xs`   | `--font-size-xs` (12px)   |
| `.text-sm`   | `--font-size-sm` (14px)   |
| `.text-base` | `--font-size-base` (16px) |
| `.text-lg`   | `--font-size-lg` (18px)   |
| `.text-xl`   | `--font-size-xl` (20px)   |
| `.text-2xl`  | `--font-size-2xl` (24px)  |
| `.text-3xl`  | `--font-size-3xl` (30px)  |

### Font Weight

| Class            | Value |
| ---------------- | ----- |
| `.font-light`    | 300   |
| `.font-regular`  | 400   |
| `.font-medium`   | 500   |
| `.font-semibold` | 600   |
| `.font-bold`     | 700   |

### Text Alignment

| Class           | CSS                   |
| --------------- | --------------------- |
| `.text-left`    | `text-align: left`    |
| `.text-center`  | `text-align: center`  |
| `.text-right`   | `text-align: right`   |
| `.text-justify` | `text-align: justify` |

### Text Truncation

| Class           | Purpose              |
| --------------- | -------------------- |
| `.truncate`     | Single line ellipsis |
| `.line-clamp-1` | 1 line max           |
| `.line-clamp-2` | 2 lines max          |
| `.line-clamp-3` | 3 lines max          |

### Example

```html
<p class="text-lg font-semibold text-center">Heading Text</p>
<p class="text-sm text-muted line-clamp-2">Truncated paragraph...</p>
```

---

## 8. Colors

Text and background colors.

### Text Colors

| Class             | Color                |
| ----------------- | -------------------- |
| `.text-primary`   | `--color-primary`    |
| `.text-secondary` | `--color-secondary`  |
| `.text-accent`    | `--color-accent`     |
| `.text-success`   | `--color-success`    |
| `.text-warning`   | `--color-warning`    |
| `.text-danger`    | `--color-danger`     |
| `.text-muted`     | `--color-text-light` |

### Background Colors

| Class             | Color                             |
| ----------------- | --------------------------------- |
| `.bg-primary`     | `--color-primary` with white text |
| `.bg-secondary`   | `--color-secondary`               |
| `.bg-accent`      | `--color-accent` with white text  |
| `.bg-success`     | `--color-success` with white text |
| `.bg-warning`     | `--color-warning` with white text |
| `.bg-danger`      | `--color-danger` with white text  |
| `.bg-transparent` | transparent                       |

### Gradient Backgrounds

| Class                  | Gradient         |
| ---------------------- | ---------------- |
| `.bg-gradient-primary` | Primary gradient |
| `.bg-gradient-accent`  | Accent gradient  |
| `.bg-gradient-success` | Success gradient |
| `.bg-gradient-warning` | Warning gradient |
| `.bg-gradient-danger`  | Danger gradient  |

---

## 9. Borders

Add and style borders.

| Class            | CSS                |
| ---------------- | ------------------ |
| `.border`        | 1px solid border   |
| `.border-t`      | Top border only    |
| `.border-r`      | Right border only  |
| `.border-b`      | Bottom border only |
| `.border-l`      | Left border only   |
| `.border-accent` | 2px accent border  |

### Border Radius

| Class           | Value                    |
| --------------- | ------------------------ |
| `.rounded`      | `--radius-md` (8px)      |
| `.rounded-sm`   | `--radius-sm` (4px)      |
| `.rounded-lg`   | `--radius-lg` (12px)     |
| `.rounded-xl`   | `--radius-xl` (16px)     |
| `.rounded-full` | `--radius-full` (circle) |

---

## 10. Shadows

Add drop shadows.

| Class              | Shadow Level            |
| ------------------ | ----------------------- |
| `.shadow-none`     | No shadow               |
| `.shadow-sm`       | Small shadow            |
| `.shadow-md`       | Medium shadow           |
| `.shadow-lg`       | Large shadow            |
| `.shadow-xl`       | Extra large shadow      |
| `.shadow-soft`     | Soft multi-layer shadow |
| `.shadow-elevated` | Strong elevation shadow |

---

## 11. Transitions & Animations

Add motion effects.

### Transitions

| Class              | Duration |
| ------------------ | -------- |
| `.transition-fast` | 150ms    |
| `.transition-base` | 250ms    |
| `.transition-slow` | 350ms    |

### Animations

| Class               | Animation        |
| ------------------- | ---------------- |
| `.animate-spin`     | Rotating spinner |
| `.animate-pulse`    | Pulsing opacity  |
| `.animate-bounce`   | Bouncing motion  |
| `.animate-fade-in`  | Fade entrance    |
| `.animate-slide-in` | Slide entrance   |
| `.animate-scale-in` | Scale entrance   |

---

## 12. Positioning

Control element positioning.

| Class       | Value                |
| ----------- | -------------------- |
| `.static`   | `position: static`   |
| `.fixed`    | `position: fixed`    |
| `.absolute` | `position: absolute` |
| `.relative` | `position: relative` |
| `.sticky`   | `position: sticky`   |
| `.inset-0`  | All sides 0          |
| `.top-0`    | `top: 0`             |
| `.right-0`  | `right: 0`           |
| `.bottom-0` | `bottom: 0`          |
| `.left-0`   | `left: 0`            |

---

## 13. Overflow

Control content overflow.

| Class               | CSS                 |
| ------------------- | ------------------- |
| `.overflow-auto`    | `overflow: auto`    |
| `.overflow-hidden`  | `overflow: hidden`  |
| `.overflow-visible` | `overflow: visible` |
| `.overflow-x-auto`  | `overflow-x: auto`  |
| `.overflow-y-auto`  | `overflow-y: auto`  |

---

## 14. Interactive States

Style interactive elements.

| Class                               | Purpose                   |
| ----------------------------------- | ------------------------- |
| `.hover\:opacity-75:hover`          | 75% opacity on hover      |
| `.hover\:shadow-lg:hover`           | Large shadow on hover     |
| `.hover\:translate-y-minus-1:hover` | Move up 1px on hover      |
| `.focus\:outline-accent:focus`      | Accent outline on focus   |
| `.focus\:ring:focus`                | Focus ring on focus       |
| `.disabled\:opacity-50:disabled`    | 50% opacity when disabled |

---

## 15. Cursor

Control cursor appearance.

| Class                 | Cursor          |
| --------------------- | --------------- |
| `.cursor-auto`        | auto            |
| `.cursor-pointer`     | pointer (hand)  |
| `.cursor-default`     | default (arrow) |
| `.cursor-not-allowed` | not-allowed     |
| `.cursor-wait`        | wait (loading)  |
| `.cursor-text`        | text            |

---

## 16. User Select

Control text selection.

| Class          | Behavior            |
| -------------- | ------------------- |
| `.select-none` | Cannot select text  |
| `.select-text` | Can select text     |
| `.select-all`  | Select all on click |

---

## 17. Pointer Events

Control pointer interactions.

| Class                  | Behavior            |
| ---------------------- | ------------------- |
| `.pointer-events-none` | Ignore mouse events |
| `.pointer-events-auto` | Allow mouse events  |

---

## 18. Whitespace & Word Break

Control text wrapping.

| Class                  | Behavior            |
| ---------------------- | ------------------- |
| `.whitespace-normal`   | Normal wrapping     |
| `.whitespace-nowrap`   | No wrapping         |
| `.whitespace-pre`      | Preserve whitespace |
| `.whitespace-pre-wrap` | Preserve + wrap     |
| `.break-words`         | Break long words    |
| `.break-all`           | Break any word      |

---

## 19. Responsive Utilities

Use responsive prefixes for mobile-first design.

### Available Prefixes

- `sm:` - Small screens (< 480px)
- `md:` - Medium screens (< 768px)

### Examples

```html
<!-- Hidden on small screens, visible on larger -->
<div class="hidden sm:block md:flex">Content</div>

<!-- Different layouts per breakpoint -->
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
  <div>Card 4</div>
</div>

<!-- Responsive padding -->
<div class="p-sm md:p-md lg:p-lg">Content with responsive padding</div>
```

---

## Best Practices

### DO ✅

- Use utility classes for quick styling
- Combine utilities for complex layouts
- Use responsive prefixes for mobile-first
- Leverage design tokens through utilities
- Use semantic class names when grouping utilities

### DON'T ❌

- Use utilities for repeated patterns (create a component instead)
- Override utility classes
- Use utilities with hardcoded values
- Mix utility systems
- Ignore responsive design

---

## Examples

### Card with Padding and Shadow

```html
<div class="p-lg rounded-lg shadow-lg bg-white">
  <h2 class="text-2xl font-semibold mb-md">Card Title</h2>
  <p class="text-base text-muted">Card content goes here.</p>
</div>
```

### Responsive Grid

```html
<div class="d-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
  <div class="rounded-lg shadow-md p-lg">Item 1</div>
  <div class="rounded-lg shadow-md p-lg">Item 2</div>
  <div class="rounded-lg shadow-md p-lg">Item 3</div>
</div>
```

### Flex Navigation

```html
<nav class="d-flex flex-row justify-between items-center px-lg py-md border-b">
  <div class="font-semibold text-lg">Logo</div>
  <div class="d-flex gap-xl">
    <a href="#" class="text-primary hover:text-accent">Link 1</a>
    <a href="#" class="text-primary hover:text-accent">Link 2</a>
  </div>
</nav>
```

### Button with Hover State

```html
<button
  class="p-md px-lg bg-accent text-white rounded-md font-medium transition-fast hover:shadow-lg hover:opacity-75 disabled:opacity-50"
>
  Click Me
</button>
```

---

## Combining with Components

Use utilities together with component classes for maximum flexibility:

```html
<!-- Using both component and utility classes -->
<button class="button button--primary transition-fast hover:shadow-lg">
  Primary Action
</button>

<div class="card p-xl">
  <h3 class="text-xl font-semibold mb-md">Card Heading</h3>
  <p class="text-base text-muted">Card description.</p>
</div>
```

---

## Performance Note

All utility classes use CSS custom properties (variables), making them:

- Small file size (979 lines, <10KB gzipped)
- Easy to customize by changing variables
- Efficient to maintain
- Fast to apply

---

## Support

For issues or questions about utility classes, refer to:

- `utilities.css` - Source file
- `DESIGN_TOKENS.md` - Token reference
- `design-system-guide.html` - Visual guide
