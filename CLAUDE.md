# CLAUDE.md - @rmdes/indiekit-frontend

## Package Overview

**Package:** `@rmdes/indiekit-frontend`
**Version:** see package.json
**Type:** Indiekit frontend plugin (fork of `@indiekit/frontend`)
**Purpose:** Provides Express view templates, CSS stylesheets, and asset configuration for the Indiekit admin dashboard

This is a **fork** of the upstream `@indiekit/frontend` package with custom UI enhancements and service worker fixes. It provides the Nunjucks environment configuration, admin views, styles, and client-side scripts that power the Indiekit admin interface.

## What This Package Provides

### Exports (index.js)

The package exports four functions used by `@indiekit/indiekit` to configure the Express app:

- **`templates`** - Configures the Nunjucks environment with paths, filters, and globals
- **`styles`** - Runs Lightning CSS compiler to bundle CSS files
- **`scripts`** - Runs esbuild to bundle JavaScript files
- **`appIcon`** and **`shortcutIcon`** — Generate app and shortcut icons (sharp/Sharp)

### File Structure

```
indiekit-frontend/
├── index.js                      # Plugin entry point
├── lib/
│   ├── nunjucks.js              # Nunjucks environment configuration
│   ├── esbuild.js               # JavaScript bundling
│   ├── lightningcss.js          # CSS compilation
│   ├── sharp.js                 # Image generation (icons)
│   └── utils/theme.js           # Theme color utilities
├── layouts/                      # Nunjucks layouts (base, navigation, footer)
├── components/                   # Nunjucks components (form fields, UI widgets)
├── styles/                       # Lightning CSS files (admin theme)
├── scripts/                      # Client-side JavaScript
│   ├── admin.js                 # Admin UI interactions
│   ├── service-worker.js        # Service worker for offline support
│   └── client-side scripts
├── locales/                      # i18n translations
└── assets/                       # Static assets (icons, fonts)
```

## Custom Modifications vs. Upstream

This fork includes the following enhancements over the upstream package:

### 1. Floating Selection Toolbar (Original)

**Commit:** a521eb2

Added a floating toolbar that appears when text is selected in form inputs and textareas. Provides quick access to formatting buttons (bold, italic, link) without cluttering the main UI.

### 2. Sidebar Navigation Redesign (Original)

**Commit:** a521eb2 onwards

Replaced flat navigation with a collapsible vertical sidebar featuring:
- Grouped navigation items (main, tools, settings, etc.)
- Fediverse group for ActivityPub-related pages
- Responsive design (collapses on mobile)
- Alpine.js-powered interactivity

### 3. Service Worker: Stale-While-Revalidate (Commit 157820d)

**File:** `scripts/service-worker.js`

Implemented intelligent caching strategy:
- Returns cached responses immediately while revalidating in background
- Shows "update available" notification when new content is served
- Gracefully handles network failures

### 4. Service Worker: Auth/Session Page Bypass (Commit 1d39c01)

**File:** `scripts/service-worker.js`

Service worker now bypasses cache for authentication and session pages (`/auth`, `/session`, etc.):
- Prevents serving stale login forms
- Ensures login/logout state is always current
- Prevents cache-related session issues

**Code pattern:**
```javascript
const noCacheRoutes = ['/auth', '/session', '/login'];
if (noCacheRoutes.some(route => url.pathname.startsWith(route))) {
  return fetch(request); // Always fetch from network
}
```

### 5. Service Worker: Cross-Origin Request Handling (Commit 3ba6ca7)

**File:** `scripts/service-worker.js`

Service worker now skips caching for cross-origin requests and properly handles cross-origin fetch failures.

### 6. Service Worker: Fetch Timeout Hardening (Commit 8800243)

**File:** `scripts/service-worker.js`

When a cached fallback exists, the service worker uses a 5-second timeout on network requests. Without a cache fallback, it waits indefinitely for the network response instead of giving up early.

**Why:** Without a cached fallback, timing out too quickly leaves the user with nothing. With a cache fallback, a 5-second timeout provides reasonable UX (show cached content while trying network; fallback to cache if network is slow).

### 7. Service Worker: Offline Page Cache Behavior (Commit f7af02f)

**File:** `scripts/service-worker.js`

Removed `clearPagesCache()` on activation. The previous behavior deleted all cached HTML on every service worker update, leaving users offline with nothing. The new behavior keeps cached pages available so users can continue browsing while an update is being pulled.

### 8. Sidebar: Conditional Section Wrappers (Commit 500900e, v1.0.0-beta.41)

**File:** `layouts/` or `components/`

Sidebar sections now use conditional wrappers:
- Only render section container if section has items
- Better categorization of navigation groups
- Cleaner empty state (no orphaned section headers)

### 9. Media Browser Integration (Commits cdc7e00 onwards)

**Files:** `scripts/`, `components/file-input-component.js`

Added modal media browser UI for file/image selection:
- Browse uploaded media files
- Filter by type (image, video, audio)
- Insert selected media into form fields
- Thumbnail previews via image resize endpoint

### 10. EasyMDE Enhancements (Commit 157820d)

**File:** `scripts/admin.js`

Integrated media browser into EasyMDE markdown editor toolbar:
- Media browser icon in toolbar
- Insert selected media with markdown syntax
- Proper alt text and caption support

## Key Architecture Decisions

### Nunjucks as Template Engine

The package uses Nunjucks (Mozilla's templating language) for server-side template rendering. The Nunjucks environment is configured in `lib/nunjucks.js`:

- **Paths:** Registered with paths from all loaded plugins (via `plugin.views`)
- **Filters:** Custom filters for formatting, localization, etc.
- **Globals:** Shared variables like `config`, `application`, `user`

All Indiekit plugins that provide views must be registered with the Nunjucks environment for their templates to be discoverable.

### Lightning CSS for Styling

The package uses Lightning CSS (a high-performance CSS compiler) to:
- Bundle CSS files from all plugins
- Apply vendor prefixes automatically
- Optimize output with minification

### esbuild for JavaScript

JavaScript bundling uses esbuild to:
- Bundle multiple script files
- Support ES6 modules
- Minify output

### Sharp for Icon Generation

The package uses Sharp to generate:
- App icons for PWA/web app shortcuts
- Favicon variants

## Service Worker Behavior

The service worker implements a sophisticated caching strategy:

1. **Normal pages** (GET, HTML, CSS, JS):
   - Return cached version immediately (if available)
   - Revalidate in background
   - Show "update available" notification on new content

2. **Auth/session pages** (/auth, /session, /login, etc.):
   - Always fetch from network
   - Never cache (prevents stale auth state)

3. **Cross-origin requests**:
   - Don't cache
   - Let them fail gracefully on network error

4. **Offline fallback**:
   - Show offline page if network fails and no cache exists

## Configuration

### Installation

```bash
npm install @rmdes/indiekit-frontend
```

### Using npm overrides (recommended for replacing the default package)

```json
{
  "overrides": {
    "@indiekit/frontend": "npm:@rmdes/indiekit-frontend@^1.0.0-beta.41"
  }
}
```

### Integration with Indiekit

The frontend plugin is automatically loaded by `@indiekit/indiekit`. It's registered as a peer dependency and configured during Indiekit startup:

```javascript
// In @indiekit/indiekit
const frontend = await import("@indiekit/frontend");
application.templateEngine = frontend.templates(application);
```

## Inter-Plugin Relationships

### Provides to Indiekit Core

- **Nunjucks environment** with template paths from all plugins
- **CSS bundle** (styles.css) compiled from all plugin stylesheets
- **JavaScript bundle** (scripts.js) bundled from all plugin scripts
- **App icons** generated from theme colors

### Works With

- **All Indiekit plugins** that provide `views/` directories (automatically registered)
- **All plugins that provide `styles/` or `scripts/`** (automatically bundled)
- **Locale files** from all plugins (automatically registered in Nunjucks)

### Used By

- **@indiekit/indiekit** — Uses templates, styles, scripts, and icons
- **Admin UI** — Renders all dashboard pages using this package's templates

## Gotchas

### 1. Template Path Discovery is Plugin-Based

Templates are only discoverable if the plugin registers a `views` path. If a plugin doesn't export `views` in its index.js, its templates won't be found.

### 2. Service Worker Doesn't Cache by Default

The service worker is opt-in. You must include it in your base template:

```nunjucks
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/scripts.js'); // or path to service worker
  }
</script>
```

### 3. CSS and JS Bundles are Single Files

All styles and scripts are bundled into single files (styles.css, scripts.js). Large bundles can impact performance. Consider code splitting if the admin interface becomes bloated.

### 4. Nunjucks Environment is Shared

All plugins use the same Nunjucks environment. Be careful with custom filter names to avoid collisions.

## Development

### Building Styles

```bash
npm run build:styles
```

### Building Scripts

```bash
npm run build:scripts
```

### Building Icons

```bash
npm run build:icons
```

### Development Mode

For development, you typically run `@indiekit/indiekit` which will handle all builds automatically.

## Testing

No automated tests are configured. Manual testing against the Indiekit admin interface is the current approach:

1. Start Indiekit with this frontend package
2. Log in to the admin dashboard
3. Test sidebar navigation, form interactions, etc.
4. Test media browser (if available)
5. Test service worker caching (offline testing)

## License

MIT - Original work by Paul Robert Lloyd, custom features by Ricardo Mendes.
