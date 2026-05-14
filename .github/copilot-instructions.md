# ANYCS Website — AI Coding Guidelines

## Project Overview
This is a static HTML/CSS/JavaScript website for the Association of Nigerian Youths in Civil Service (ANYCS). The site consists of multiple standalone HTML pages with shared assets.

## Architecture
- **Structure**: Multi-page static site with separate HTML files for each section (index.html, about.html, etc.)
- **Styling**: Centralized design system in `css/styles.css` using CSS custom properties
- **Interactivity**: Vanilla JavaScript in `js/main.js` handling navigation, animations, and forms
- **No build tools**: Direct file editing, no compilation or bundling required

## Key Patterns

### HTML Structure
Each page follows a consistent template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title — ANYCS</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <!-- Navbar (copied from index.html) -->
  <nav class="navbar" id="navbar">...</nav>
  <div class="mobile-overlay" id="mobileOverlay"></div>

  <!-- Page content -->
  <section class="page-hero">...</section>
  <!-- Content sections -->

  <!-- Footer (copied from index.html) -->
  <footer class="footer">...</footer>

  <script src="js/main.js"></script>
</body>
</html>
```

### CSS Conventions
- **Design System**: All colors, fonts, spacing defined as CSS custom properties in `:root`
- **BEM-like Classes**: Component-based naming (e.g., `navbar__logo`, `btn--primary`, `section--gray`)
- **Responsive Grid**: Use `grid` and `grid--{2|3|4}` classes for layouts
- **Animations**: Apply `fade-in` class for scroll-triggered animations

### JavaScript Patterns
- **Initialization**: All features initialized in `DOMContentLoaded` event
- **Modular Functions**: Separate functions for navbar, mobile menu, scroll animations, tabs, forms
- **Event Handling**: Use `addEventListener` with proper cleanup where needed
- **DOM Selection**: Prefer `querySelector` and `querySelectorAll` over older methods

## Development Workflow
- **Local Development**: Open `index.html` directly in browser (no server required)
- **File Organization**: Keep HTML pages in root, CSS in `css/`, JS in `js/`
- **Navigation**: Update navbar links manually across all HTML files when adding new pages
- **Consistency**: Copy navbar/footer from `index.html` to maintain uniformity

## Common Tasks
- **Adding Pages**: Create new `.html` file, copy navbar/footer from existing page, update navigation links
- **Styling**: Add styles to `css/styles.css`, use existing custom properties and class patterns
- **Interactivity**: Extend `js/main.js` with new functions, call from main init block
- **Content Updates**: Edit HTML directly, maintain semantic structure with proper headings and sections

## Key Files
- `index.html`: Homepage with hero, stats, objectives preview
- `css/styles.css`: Complete design system and component styles
- `js/main.js`: All client-side functionality
- Other `.html` files: Individual pages following the same structure</content>
<parameter name="filePath">/Users/ffh/Downloads/anycs/.github/copilot-instructions.md