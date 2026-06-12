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
│   ├── app.js                   # Bundle entry (imports components/*/index.js)
│   └── utils/                   # Shared client-side utilities (e.g. focusable.js)
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

**File:** `lib/serviceworker.js`

Implemented intelligent caching strategy:
- Returns cached responses immediately while revalidating in background
- Shows "update available" notification when new content is served
- Gracefully handles network failures

### 4. Service Worker: Auth/Session Page Bypass (Commit 1d39c01)

**File:** `lib/serviceworker.js`

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

**File:** `lib/serviceworker.js`

Service worker now skips caching for cross-origin requests and properly handles cross-origin fetch failures.

### 6. Service Worker: Fetch Timeout Hardening (Commit 8800243)

**File:** `lib/serviceworker.js`

When a cached fallback exists, the service worker uses a 5-second timeout on network requests. Without a cache fallback, it waits indefinitely for the network response instead of giving up early.

**Why:** Without a cached fallback, timing out too quickly leaves the user with nothing. With a cache fallback, a 5-second timeout provides reasonable UX (show cached content while trying network; fallback to cache if network is slow).

### 7. Service Worker: Offline Page Cache Behavior (Commit f7af02f)

**File:** `lib/serviceworker.js`

Removed `clearPagesCache()` on activation. The previous behavior deleted all cached HTML on every service worker update, leaving users offline with nothing. The new behavior keeps cached pages available so users can continue browsing while an update is being pulled.

### 8. Sidebar: Conditional Section Wrappers (Commit 500900e, v1.0.0-beta.41)

**File:** `layouts/` or `components/`

Sidebar sections now use conditional wrappers:
- Only render section container if section has items
- Better categorization of navigation groups
- Cleaner empty state (no orphaned section headers)

### 9. Media Browser Integration (Commits cdc7e00 onwards)

**Files:** `lib/media-browser.js`, `components/file-input/index.js`

Added modal media browser UI for file/image selection:
- Browse uploaded media files
- Filter by type (image, video, audio)
- Insert selected media into form fields
- Thumbnail previews via image resize endpoint

### 10. EasyMDE Enhancements (Commit 157820d)

**File:** `components/textarea/index.js`

Integrated media browser into EasyMDE markdown editor toolbar:
- Media browser icon in toolbar
- Insert selected media with markdown syntax
- Proper alt text and caption support

### 11. Site Builder Phase 4 primitives (v1.0.0-beta.42)

**Files:** `components/modal-dialog/`, `components/toggle-switch/`, `scripts/utils/focusable.js`

- **modal-dialog** component: native `<dialog>` + `showModal()` (focus trap, Esc, `::backdrop` for free). Openers via `[data-modal-open="<id>"]`, close via `[data-modal-close]`; focus returns to the opener on close. No-JS contract documented in `macro.njk` — consumers must provide a `<noscript>` fallback.
- **toggle-switch** component: checkbox with `role="switch"` that degrades to a plain checkbox; CSS-drawn track/thumb, optional `data-toggle-submit` form submission.
- **`scripts/utils/focusable.js`**: shared `focusableSelector` util — single source of truth, fixes add-another's previously inlined selector which had a broken trailing clause (missing `)]`).

Consumed by the site-config composition editor (Site Builder Phase 4).

### 12. Service Worker: Preview Page Bypass (v1.0.0-beta.44)

**File:** `lib/serviceworker.js`

Extended the auth/session cache bypass regex to also cover `/preview` (`/^\/(auth|session|preview)(?:\/|$)/`) in BOTH places it appears: the fetch handler (network-only respondWith) and `clearAuthSessionEntries()` (activate-time purge).

**Why:** Site Builder Phase 5 serves true-preview pages at `/preview/<token>/` rendered by Eleventy. The composition editor embeds the preview in an iframe and polls a `data-preview-revision` attribute until a fresh build lands. The SW's network-first-with-5s-timeout HTML strategy would otherwise cache preview pages and can serve stale entries on slow networks, breaking revision polling. Preview tokens also rotate on publish, so cached entries would be dead weight in the 50-entry pages cache.

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
    "@indiekit/frontend": "npm:@rmdes/indiekit-frontend@^1.0.0-beta.42"
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
- **CSS bundle** (served at `/assets/app-<hash>.css`) compiled from `styles/app.css`
- **JavaScript bundle** (served at `/assets/app-<hash>.js`) bundled from `scripts/app.js`
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

### 2. Service Worker is Served by Indiekit Core

The service worker source lives at `lib/serviceworker.js` in this package; `@indiekit/indiekit` reads it, substitutes the current asset paths, and serves it at `/serviceworker.js`, where the admin layout registers it.

### 3. CSS and JS Bundles are Single Files

All styles and scripts are bundled into single files (`/assets/app-<hash>.css`, `/assets/app-<hash>.js`). Large bundles can impact performance. Consider code splitting if the admin interface becomes bloated.

### 4. Nunjucks Environment is Shared

All plugins use the same Nunjucks environment. Be careful with custom filter names to avoid collisions.

## Development

### No Build Step

There is **no build step and no npm scripts** in this package (`package.json` has no `scripts` field). Bundling happens at request time inside `@indiekit/indiekit` via this package's exported functions:

- **`styles()`** (`lib/lightningcss.js`) — Lightning CSS `bundleAsync` on `styles/app.css` (which `@import`s all component stylesheets), minified
- **`scripts()`** (`lib/esbuild.js`) — esbuild `build()` with `scripts/app.js` as entry point (which imports `components/*/index.js`), bundled and minified in-memory (`write: false`)
- **`appIcon()`/`shortcutIcon()`** (`lib/sharp.js`) — Sharp-generated icons

`@indiekit/indiekit` serves the resulting bundles at `/assets/app-<hash>.css` and `/assets/app-<hash>.js`, and serves `lib/serviceworker.js` at `/serviceworker.js`.

### Verifying Changes

```bash
# Syntax check
node --check scripts/app.js

# Bundle smoke test (exactly what the runtime does)
node -e "import('esbuild').then(e => e.build({entryPoints: ['scripts/app.js'], bundle: true, write: false, minify: true}).then(r => console.log('bundle OK', r.outputFiles[0].text.length, 'bytes')))"
```

## Testing

No automated tests are configured. Manual testing against the Indiekit admin interface is the current approach:

1. Start Indiekit with this frontend package
2. Log in to the admin dashboard
3. Test sidebar navigation, form interactions, etc.
4. Test media browser (if available)
5. Test service worker caching (offline testing)

## License

MIT - Original work by Paul Robert Lloyd, custom features by Ricardo Mendes.
