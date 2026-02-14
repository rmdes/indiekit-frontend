/**
 * Shared media browser modal for browsing and selecting existing media files.
 * Used by both the textarea (EasyMDE) and file-input components.
 *
 * @param {object} options
 * @param {string} options.endpoint - Media endpoint URL (e.g., "/media")
 * @param {Function} options.onSelect - Callback when a media item is selected: (url, filename, isImage) => void
 * @param {Function} [options.onClose] - Optional callback when modal is closed without selection
 * @param {string} [options.filterType] - Optional initial filter type ("all", "photo", "audio", "video")
 */
export function openMediaBrowser({ endpoint, onSelect, onClose, filterType }) {
  let allItems = [];
  let afterCursor = null;
  let activeFilter = filterType || "all";

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "media-browser";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Browse media");

  const modal = document.createElement("div");
  modal.className = "media-browser__modal";

  // Header
  const header = document.createElement("div");
  header.className = "media-browser__header";

  const title = document.createElement("h2");
  title.className = "media-browser__title";
  title.textContent = "Browse media";
  header.append(title);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "media-browser__close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "\u00D7";
  closeBtn.addEventListener("click", close);
  header.append(closeBtn);

  // Filters
  const filters = document.createElement("div");
  filters.className = "media-browser__filters";

  for (const filter of ["all", "photo", "audio", "video"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "media-browser__filter";
    if (filter === activeFilter) btn.classList.add("is-active");
    btn.textContent = filter.charAt(0).toUpperCase() + filter.slice(1);
    btn.dataset.filter = filter;
    btn.addEventListener("click", () => {
      activeFilter = filter;
      for (const f of filters.querySelectorAll(".media-browser__filter")) {
        f.classList.toggle("is-active", f.dataset.filter === filter);
      }
      renderGrid();
    });
    filters.append(btn);
  }

  // Grid
  const grid = document.createElement("div");
  grid.className = "media-browser__grid";

  // Loading
  const loading = document.createElement("div");
  loading.className = "media-browser__loading";
  loading.textContent = "Loading\u2026";

  // Empty
  const empty = document.createElement("p");
  empty.className = "media-browser__empty";
  empty.textContent = "No media files found.";
  empty.hidden = true;

  // Load more
  const loadMoreBtn = document.createElement("button");
  loadMoreBtn.type = "button";
  loadMoreBtn.className = "media-browser__load-more";
  loadMoreBtn.textContent = "Load more";
  loadMoreBtn.hidden = true;
  loadMoreBtn.addEventListener("click", () => fetchMedia());

  modal.append(header, filters, grid, loading, empty, loadMoreBtn);
  overlay.append(modal);
  document.body.append(overlay);

  // Lock body scroll
  document.body.style.overflow = "hidden";

  // Close handlers
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  const onKeyDown = (event) => {
    if (event.key === "Escape") close();
  };
  document.addEventListener("keydown", onKeyDown);

  function close() {
    overlay.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeyDown);
    if (onClose) onClose();
  }

  function getFilteredItems() {
    if (activeFilter === "all") return allItems;
    return allItems.filter((item) => {
      const type = item["media-type"] || "";
      return type === activeFilter;
    });
  }

  function isImageType(mediaType) {
    return mediaType === "photo";
  }

  function getMediaIcon(mediaType) {
    if (!mediaType) return "\uD83D\uDCC4";
    if (mediaType === "audio") return "\uD83C\uDFB5";
    if (mediaType === "video") return "\uD83C\uDFAC";
    return "\uD83D\uDCC4";
  }

  function getFilename(url) {
    try {
      return decodeURIComponent(url.split("/").pop());
    } catch {
      return url.split("/").pop();
    }
  }

  function renderGrid() {
    grid.replaceChildren();
    const filtered = getFilteredItems();
    empty.hidden = filtered.length > 0;

    for (const item of filtered) {
      const url = item.url;
      const mediaType = item["media-type"] || "";
      const isImage = isImageType(mediaType);
      const filename = getFilename(url);

      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "media-browser__item";
      tile.title = filename;
      tile.addEventListener("click", () => {
        onSelect(url, filename, isImage);
        close();
      });

      if (isImage) {
        const img = document.createElement("img");
        img.src = `/image/s_240x240/${encodeURIComponent(url)}`;
        img.alt = filename;
        img.loading = "lazy";
        img.className = "media-browser__thumbnail";
        tile.append(img);
      } else {
        const icon = document.createElement("span");
        icon.className = "media-browser__icon";
        icon.textContent = getMediaIcon(mediaType);
        tile.append(icon);

        const name = document.createElement("span");
        name.className = "media-browser__filename";
        name.textContent = filename;
        tile.append(name);
      }

      grid.append(tile);
    }
  }

  async function fetchMedia() {
    loading.hidden = false;
    loadMoreBtn.hidden = true;

    try {
      const url = new URL(endpoint, globalThis.location.origin);
      url.searchParams.set("q", "source");
      url.searchParams.set("limit", "20");
      if (afterCursor) url.searchParams.set("after", afterCursor);

      const response = await fetch(url.href, { credentials: "same-origin" });
      if (!response.ok) throw new Error(response.statusText);

      const data = await response.json();
      const items = data.items || [];
      allItems = allItems.concat(items);

      afterCursor =
        data.paging && data.paging.after ? data.paging.after : null;
      loadMoreBtn.hidden = !afterCursor;

      renderGrid();
    } catch (error) {
      const errorMsg = document.createElement("p");
      errorMsg.className = "media-browser__error";
      errorMsg.textContent = `Error loading media: ${error.message}`;
      grid.replaceChildren(errorMsg);
    } finally {
      loading.hidden = true;
    }
  }

  // Initial fetch
  fetchMedia();
}
