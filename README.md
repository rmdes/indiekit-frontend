# @rmdes/indiekit-frontend

Frontend components and view templates for Indiekit admin dashboard.

**This is a fork** of `@indiekit/frontend` with custom UI enhancements, service worker improvements, and accessibility fixes (see below).

## Installation

```bash
npm install @rmdes/indiekit-frontend
```

Or via npm overrides (recommended for replacing the default package):

```json
{
  "overrides": {
    "@indiekit/frontend": "npm:@rmdes/indiekit-frontend@^1.0.0-beta.41"
  }
}
```

> [!NOTE]
> This package is installed automatically as a dependency of `@indiekit/indiekit`

## Custom Features in This Fork

This fork adds the following enhancements to the upstream package:

### UI Enhancements

- **Floating Toolbar** — Quick formatting access when text is selected in forms
- **Sidebar Navigation** — Collapsible vertical sidebar with grouped navigation items
- **Media Browser** — Modal for browsing and inserting uploaded media files
- **Better Form UX** — Improved EasyMDE editor integration

### Service Worker Improvements

- **Stale-While-Revalidate** — Serve cached content immediately while revalidating in background
- **Auth Page Bypass** — Never cache authentication/session pages (prevents stale login state)
- **Intelligent Timeouts** — 5-second network timeout only when cached fallback exists
- **Update Notifications** — Notify users when content has been updated

### Sidebar Navigation

- Grouped menu items (Main, Tools, Settings, Fediverse)
- Collapsible sections
- Better mobile responsiveness
- Alpine.js-powered interactivity

## What This Package Provides

The package exports functions used by Indiekit to configure the admin interface:

- **Templates** — Nunjucks environment with plugin view paths
- **Styles** — CSS bundle compiled from all plugin stylesheets
- **Scripts** — JavaScript bundle with admin interactivity and service worker
- **Icons** — App and shortcut icons generated from theme colors

## Service Worker

The service worker provides offline support with a smart caching strategy:

- Serves cached pages immediately while updating in background
- Keeps authentication pages always fresh (no caching)
- Falls back to offline page when network is unavailable
- Handles cross-origin requests gracefully

Enable it in your base template:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/scripts.js');
  }
</script>
```

## Configuration

The frontend is automatically configured by `@indiekit/indiekit`. No additional setup is required, but you can customize via environment variables and Indiekit configuration.

## File Structure

```
indiekit-frontend/
├── layouts/         # Nunjucks page layouts
├── components/      # Nunjucks UI components
├── styles/          # Lightning CSS stylesheets
├── scripts/         # Client-side JavaScript
├── locales/         # Translation strings
└── assets/          # Static assets (icons, fonts)
```

## Inter-Plugin Integration

All Indiekit plugins can extend the frontend by providing:

- **`views/`** — Nunjucks templates (automatically registered)
- **`styles/`** — CSS files (automatically bundled)
- **`scripts/`** — JavaScript (automatically bundled)
- **`locales/`** — Translation strings (automatically registered)

## License

MIT - Original work by Paul Robert Lloyd, custom features by Ricardo Mendes.

For detailed technical documentation, see `CLAUDE.md` in this repository.
