const assetCacheName = "assets-APP_VERSION";
const pagesCacheName = "pages";
const imageCacheName = "images";
const maxPages = 50; // Maximum number of pages to cache
const maxImages = 100; // Maximum number of images to cache
const timeout = 5000; // Number of milliseconds before timing out
const cacheList = new Set([assetCacheName, pagesCacheName, imageCacheName]);
const placeholderImage = `<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="icon" fill="#AAA" d="M24 32a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-6.9-11.9 4.1 4.1a17 17 0 0 0-9.7 5.3L8 26a22 22 0 0 1 9-6Zm22.5 5.4L36 29l-.8-.8L26 19a22 22 0 0 1 13.5 6.4ZM8.2 11.2l3.7 3.7a24.7 24.7 0 0 0-8.4 6.6l-3.6-3.6c2.4-2.7 5.2-5 8.3-6.7ZM24 7a32 32 0 0 1 23.4 10.2l-3.5 3.6a27 27 0 0 0-24.5-8.4l-4.2-4.2A32 32 0 0 1 24 7ZM2 5l3-3 41 41-3 3L2 5Z" opacity=".7"/>
</defs><rect fill="#000" width="100%" height="100%" opacity="0.075"/><use href="#icon" x="50%" y="50%" transform="translate(-24 -24)"/></svg>`;

/**
 * Check if a URL is a hashed asset (content-addressable, immutable)
 * @param {string} url - Request URL
 * @returns {boolean}
 */
function isHashedAsset(url) {
  return /\/assets\/app-[a-f0-9]+\.(js|css)$/.test(url);
}

/**
 * Update asset cache
 * @returns {Promise<Cache>} - Updated asset cache
 */
async function updateAssetCache() {
  try {
    const assetCache = await caches.open(assetCacheName);

    // These items won't block the installation of the service worker
    assetCache.addAll(["/app.webmanifest"]);

    // These items must be cached for service worker to complete installation
    await assetCache.addAll(["APP_CSS_PATH", "APP_JS_PATH", "/offline"]);

    return assetCache;
  } catch (error) {
    console.error("Error updating asset cache", error);
  }
}

/**
 * Cache the page(s) that initiate the service worker
 * @returns {Promise<Cache>} - Updated page cache
 */
async function cacheClients() {
  const pages = [];
  try {
    const allClients = await clients.matchAll({ includeUncontrolled: true });

    for (const client of allClients) {
      pages.push(client.url);
    }

    const pagesCache = await caches.open(pagesCacheName);
    await pagesCache.addAll(pages);

    return pagesCache;
  } catch (error) {
    console.error("Error updating client cache", error);
  }
}

/**
 * Remove caches whose name is no longer valid
 */
async function clearOldCaches() {
  try {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) => !cacheList.has(key))
        .map((key) => caches.delete(key)),
    );
  } catch (error) {
    console.error("Error clearing old caches", error);
  }
}

/**
 * Notify all clients that the service worker has been updated
 */
async function notifyClients() {
  const version = assetCacheName.replace("assets-", "");
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({ command: "SW_UPDATED", version });
  }
}

/**
 * Trim cache
 * @param {string} cacheName - Name of cache
 * @param {number} maxItems - Maximum number of items to keep in cache
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      await trimCache(cacheName, maxItems);
    }
  } catch (error) {
    console.error(`Error trimming ${cacheName} cache`, error);
  }
}

self.addEventListener("install", async (event) => {
  event.waitUntil(
    (async () => {
      await updateAssetCache();
      await cacheClients();
      globalThis.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", async (event) => {
  event.waitUntil(
    (async () => {
      await clearOldCaches();
      // Don't clear pages cache on activate — stale cached pages provide a
      // valuable fallback when the network is slow (e.g. right after a deploy).
      // The network-first fetch strategy naturally updates cached pages on
      // every successful navigation, so stale entries are short-lived.
      await clients.claim();
      await notifyClients();
    })(),
  );
});

if (registration.navigationPreload) {
  self.addEventListener("activate", (event) => {
    event.waitUntil(registration.navigationPreload.enable());
  });
}

self.addEventListener("message", (event) => {
  if (event.data.command == "trimCaches") {
    trimCache(pagesCacheName, maxPages);
    trimCache(imageCacheName, maxImages);
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Ignore cross-origin and non-GET requests.
  // Cross-origin images (avatars, album covers, etc.) must be handled
  // by the browser natively — opaque responses from SW fetch are unreliable
  // and caching them wastes ~7MB each against storage quota.
  if (
    new URL(request.url).origin !== self.location.origin ||
    request.method !== "GET"
  ) {
    return;
  }

  // For HTML requests: network-first with conditional timeout
  // - If a cached version exists: race network against timeout, serve cache on timeout
  // - If no cached version: wait for network without timeout (avoid premature "Offline")
  if (
    request.mode === "navigate" ||
    (request.headers.get("Accept") || "").includes("text/html")
  ) {
    event.respondWith(
      (async () => {
        // Check cache and start network fetch in parallel
        const cachedResponse = await caches.match(request);
        const networkFetch = (async () => {
          const preloadResponse = await Promise.resolve(event.preloadResponse);
          return preloadResponse || (await fetch(request));
        })();

        try {
          // Only apply timeout when we have a cached fallback.
          // Without a cache, it's better to wait for the network (loading spinner)
          // than to show "Offline" after 5 seconds on a slow backend.
          const responseFromNetwork = cachedResponse
            ? await Promise.race([
                networkFetch,
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Network timeout")),
                    timeout,
                  ),
                ),
              ])
            : await networkFetch;

          // NETWORK succeeded — cache and serve
          try {
            const copy = responseFromNetwork.clone();
            const pagesCache = await caches.open(pagesCacheName);
            await pagesCache.put(request, copy);
          } catch (cacheError) {
            console.error("Failed to cache page:", cacheError);
          }

          return responseFromNetwork;
        } catch {
          // NETWORK failed or timed out — fall back to cache or offline
          return (
            cachedResponse ||
            (await caches.match("/offline")) ||
            new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );

    return;
  }

  // For hashed assets (e.g. /assets/app-abc123.js): cache-first
  // These URLs are content-addressable — the content never changes for a given hash
  if (isHashedAsset(request.url)) {
    event.respondWith(
      (async () => {
        const responseFromCache = await caches.match(request);
        if (responseFromCache) {
          return responseFromCache;
        }

        try {
          const responseFromFetch = await fetch(request);
          const copy = responseFromFetch.clone();
          const assetCache = await caches.open(assetCacheName);
          await assetCache.put(request, copy);
          return responseFromFetch;
        } catch (error) {
          console.error("Fetch failed for hashed asset:", error, request.url);
          return new Response("Network error", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        }
      })(),
    );

    return;
  }

  // For other non-HTML requests: stale-while-revalidate
  // Serve from cache immediately, update cache in background
  event.respondWith(
    (async () => {
      try {
        const responseFromCache = await caches.match(request);

        // Start network fetch regardless (to update cache)
        const fetchPromise = fetch(request)
          .then(async (responseFromFetch) => {
            // Update cache with fresh response
            if (/\.(jpe?g|png|gif|svg|webp)/.test(request.url)) {
              try {
                const copy = responseFromFetch.clone();
                const imagesCache = await caches.open(imageCacheName);
                await imagesCache.put(request, copy);
              } catch (cacheError) {
                console.error("Failed to cache image:", cacheError);
              }
            }
            return responseFromFetch;
          })
          .catch((error) => {
            console.error(
              "Background fetch failed:",
              error,
              request.url,
            );
            return null;
          });

        if (responseFromCache) {
          // CACHE HIT — serve cached, update in background
          return responseFromCache;
        }

        // CACHE MISS — wait for network
        const responseFromFetch = await fetchPromise;
        if (responseFromFetch) {
          return responseFromFetch;
        }

        // OFFLINE IMAGE
        if (/\.(jpe?g|png|gif|svg|webp)/.test(request.url)) {
          return new Response(placeholderImage, {
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": "no-store",
            },
          });
        }

        return new Response("Network error", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      } catch (error) {
        console.error(
          "Fetch failed for non-HTML resource:",
          error,
          request.url,
        );

        if (/\.(jpe?g|png|gif|svg|webp)/.test(request.url)) {
          return new Response(placeholderImage, {
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": "no-store",
            },
          });
        }

        return new Response("Network error", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      }
    })(),
  );
});
