// Catalog interactions. Python serves validated data; browser state stays local.
const header = document.querySelector("#site-header");
const navigation = document.querySelector("#navigation");
const menuButton = document.querySelector(".menu-toggle");
const track = document.querySelector("#product-track");
const cards = [...document.querySelectorAll(".product")];
const dialogs = [...document.querySelectorAll("dialog")];
const browseDialog = document.querySelector("#browse-dialog");
const productDialog = document.querySelector("#product-dialog");
const sceneDialog = document.querySelector("#scene-dialog");
const status = document.querySelector("#product-status");
const details = document.querySelector("#product-detail");
const knownSlugs = new Set(
  cards.map((card) => card.querySelector("[data-product]").dataset.product),
);
const euros = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});
let collection = "Tutti",
  category = null,
  browseMode = "search",
  lookCollection = null;
let requestController,
  sceneModule,
  currentProduct,
  productOpener,
  catalogPromise;
let browseRevision = 0,
  searchTimer;
function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
const wishlist = new Set(
  readStored("oreva-wishlist-v1", []).filter((slug) => knownSlugs.has(slug)),
);
const cart = new Map(
  readStored("oreva-cart-v1", [])
    .filter(
      (item) =>
        item &&
        knownSlugs.has(item.slug) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 99,
    )
    .map((item) => [item.slug, item.quantity]),
);
function saveState() {
  try {
    localStorage.setItem("oreva-wishlist-v1", JSON.stringify([...wishlist]));
    localStorage.setItem(
      "oreva-cart-v1",
      JSON.stringify([...cart].map(([slug, quantity]) => ({ slug, quantity }))),
    );
  } catch {
    /* Storage disabled: selections remain available in this session. */
  }
  refreshState();
}
function refreshState() {
  const wishlistCount = document.querySelector("#wishlist-count");
  wishlistCount.textContent = wishlist.size;
  wishlistCount.hidden = wishlist.size === 0;
  const cartCount = document.querySelector("#cart-count");
  const quantity = [...cart.values()].reduce((a, b) => a + b, 0);
  cartCount.textContent = quantity;
  cartCount.hidden = quantity === 0;
  document.querySelectorAll(".favorite-button").forEach((button) => {
    const saved = wishlist.has(button.dataset.favorite);
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
    const name = button
      .closest(".product")
      .querySelector(".product-name")
      .textContent.trim();
    button.setAttribute(
      "aria-label",
      (saved ? "Rimuovi " : "Aggiungi ") +
        name +
        (saved ? " dai preferiti" : " ai preferiti"),
    );
  });
}
refreshState();
function closeMenu() {
  navigation.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Apri menu");
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  navigation.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
});
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a,button")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
    const opened = dialogs.find((dialog) => dialog.open);
    if (opened) {
      event.preventDefault();
      opened.close();
    }
  }
});
function updateHeader() {
  header.classList.toggle("scrolled", scrollY > 30);
}
addEventListener("scroll", updateHeader, { passive: true });
updateHeader();
function updateCarousel() {
  document.querySelector(".previous").disabled = track.scrollLeft < 3;
  document.querySelector(".next").disabled =
    track.scrollLeft + track.clientWidth >= track.scrollWidth - 3;
}
track.addEventListener("scroll", updateCarousel, { passive: true });
new ResizeObserver(updateCarousel).observe(track);
function filterCatalog(scroll = true) {
  let count = 0;
  cards.forEach((card) => {
    card.hidden =
      (collection !== "Tutti" && card.dataset.collection !== collection) ||
      (category !== null && card.dataset.category !== category);
    if (!card.hidden) count++;
  });
  document.querySelectorAll(".collection-tabs button").forEach((button) => {
    const active = button.dataset.collectionFilter === collection;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const clear = document.querySelector("#clear-category");
  clear.hidden = category === null;
  clear.textContent = category ? category + " ×" : "";
  clear.setAttribute("aria-label", "Rimuovi filtro categoria");
  document.querySelector("#catalog-count").textContent =
    count + (count === 1 ? " creazione" : " creazioni");
  track.scrollLeft = 0;
  updateCarousel();
  closeMenu();
  if (scroll)
    document.querySelector("#collezioni").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
}
document.querySelector("#clear-category").addEventListener("click", () => {
  category = null;
  filterCatalog(false);
});
function syncBody() {
  document.body.classList.toggle(
    "dialog-open",
    dialogs.some((dialog) => dialog.open),
  );
}
function showDialog(dialog) {
  dialogs.forEach((other) => {
    if (other !== dialog && other.open) other.close();
  });
  if (!dialog.open) dialog.showModal();
  closeMenu();
  syncBody();
}
dialogs.forEach((dialog) => {
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", syncBody);
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close();
  });
});
async function catalogData() {
  if (!catalogPromise)
    catalogPromise = fetch("/api/catalog")
      .then((response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json();
      })
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  return catalogPromise;
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(text, label) {
  const node = element("button", "", text);
  node.type = "button";
  if (label) node.setAttribute("aria-label", label);
  return node;
}
function productRow(product) {
  const row = element("article", "browse-item");
  const imageButton = button("", "Scopri " + product.name);
  imageButton.className = "browse-item-image";
  imageButton.dataset.product = product.slug;
  const image = element("img");
  image.src = product.image;
  image.alt = product.image_alt;
  imageButton.append(image);
  row.append(imageButton);
  const copy = element("div");
  const title = button(product.name);
  title.className = "browse-item-title";
  title.dataset.product = product.slug;
  copy.append(
    title,
    element("p", "browse-item-material", product.material),
    element("p", "browse-item-price", euros.format(product.price_eur)),
  );
  const actions = element("div", "browse-item-actions");
  if (browseMode === "cart") {
    const quantity = cart.get(product.slug);
    const controls = element("div", "quantity-controls");
    const minus = button("−", "Riduci quantità di " + product.name),
      plus = button("+", "Aumenta quantità di " + product.name);
    minus.dataset.cartSlug = plus.dataset.cartSlug = product.slug;
    minus.dataset.cartStep = "-1";
    plus.dataset.cartStep = "1";
    plus.disabled = quantity >= 99;
    controls.append(minus, element("span", "", String(quantity)), plus);
    const remove = button(
      "Rimuovi",
      "Rimuovi " + product.name + " dal carrello",
    );
    remove.dataset.removeCart = product.slug;
    actions.append(controls, remove);
  } else if (browseMode === "wishlist") {
    const remove = button("Rimuovi dai preferiti");
    remove.dataset.favorite = product.slug;
    actions.append(remove);
  } else {
    const discover = button("Scopri il gioiello");
    discover.dataset.product = product.slug;
    actions.append(discover);
  }
  copy.append(actions);
  row.append(copy);
  return row;
}
function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
async function renderBrowse() {
  const revision = ++browseRevision;
  const results = document.querySelector("#browse-results"),
    message = document.querySelector("#browse-status");
  const summary = document.querySelector("#cart-summary");
  summary.hidden = true;
  message.textContent = "Caricamento…";
  results.replaceChildren();
  try {
    const catalog = await catalogData();
    if (revision !== browseRevision || !browseDialog.open) return;
    let products = catalog.products;
    if (browseMode === "search") {
      const query = normalize(
        document.querySelector("#search-input").value.trim(),
      );
      products = products.filter((product) =>
        normalize(
          [
            product.name,
            product.material,
            product.collection,
            product.category,
          ].join(" "),
        ).includes(query),
      );
      message.textContent = products.length
        ? products.length + " gioielli da esplorare"
        : "Nessun gioiello trovato. Prova un nome, un materiale o una collezione.";
    } else if (browseMode === "wishlist") {
      products = products.filter((product) => wishlist.has(product.slug));
      message.textContent = products.length
        ? "Le creazioni che hai scelto di ricordare."
        : "Non hai ancora salvato un gioiello. Usa il cuore sulle schede del catalogo.";
    } else if (browseMode === "cart") {
      products = products.filter((product) => cart.has(product.slug));
      message.textContent = products.length
        ? "La tua selezione di prova."
        : "Il carrello dimostrativo è vuoto. Apri un gioiello e aggiungilo alla tua selezione.";
      if (products.length) {
        const total = products.reduce(
          (value, product) =>
            value + product.price_eur * cart.get(product.slug),
          0,
        );
        document.querySelector("#cart-total").textContent = euros.format(total);
        summary.hidden = false;
      }
    } else {
      products = products.filter(
        (product) => product.collection === lookCollection,
      );
      message.textContent =
        "Le creazioni della collezione " + lookCollection + ".";
    }
    results.replaceChildren(...products.map(productRow));
  } catch {
    if (revision === browseRevision && browseDialog.open)
      message.textContent =
        "Il catalogo non è disponibile. Chiudi il pannello e riprova tra poco.";
  }
}
function openBrowse(mode, look) {
  browseMode = mode;
  lookCollection = look || null;
  document.querySelector("#browse-title").textContent =
    mode === "search"
      ? "Cerca un gioiello"
      : mode === "wishlist"
        ? "I tuoi preferiti"
        : mode === "cart"
          ? "Il tuo carrello demo"
          : "Il look " + look;
  document.querySelector("#search-form").hidden = mode !== "search";
  showDialog(browseDialog);
  renderBrowse();
  if (mode === "search") document.querySelector("#search-input").focus();
}
browseDialog.addEventListener("close", () => {
  if (!browseDialog.open) browseRevision++;
});
document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(searchTimer);
  renderBrowse();
});
document.querySelector("#search-input").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderBrowse, 120);
});
document.querySelector("#empty-cart").addEventListener("click", () => {
  cart.clear();
  saveState();
  renderBrowse();
});
productDialog.addEventListener("close", () => {
  if (!productDialog.open) requestController?.abort();
});
async function openProduct(slug, opener) {
  productOpener = opener;
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  currentProduct = null;
  details.hidden = true;
  status.hidden = false;
  status.textContent = "Caricamento del gioiello…";
  showDialog(productDialog);
  try {
    const response = await fetch("/api/jewels/" + encodeURIComponent(slug), {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Jewel unavailable");
    const product = await response.json();
    if (controller.signal.aborted || !productDialog.open) return;
    currentProduct = product;
    document.querySelector("#product-title").textContent = product.name;
    document.querySelector("#detail-category").textContent =
      product.category.toUpperCase() + " — " + product.collection.toUpperCase();
    document.querySelector("#detail-description").textContent =
      product.description;
    document.querySelector("#detail-material").textContent = product.material;
    document.querySelector("#detail-collection").textContent =
      product.collection;
    document.querySelector("#detail-price").textContent = euros.format(
      product.price_eur,
    );
    const image = document.querySelector("#detail-image");
    image.src = product.image;
    image.alt = product.image_alt;
    document.querySelector("#detail-3d").hidden =
      product.slug !== "anello-materia";
    status.hidden = true;
    details.hidden = false;
  } catch (error) {
    if (
      error.name !== "AbortError" &&
      !controller.signal.aborted &&
      productDialog.open
    )
      status.textContent =
        "Il gioiello non è disponibile in questo momento. Chiudi e riprova tra poco.";
  }
}
document.querySelector("#detail-add-cart").addEventListener("click", () => {
  if (!currentProduct) return;
  cart.set(
    currentProduct.slug,
    Math.min(99, (cart.get(currentProduct.slug) || 0) + 1),
  );
  saveState();
  openBrowse("cart");
});
async function openScene() {
  showDialog(sceneDialog);
  try {
    sceneModule ||= import("./scene.js");
    const scene = await sceneModule;
    scene.initialize();
    if (sceneDialog.open) scene.resume();
  } catch {
    sceneDialog.classList.add("scene-error");
    document.querySelector("#scene-status").textContent =
      "Il 3D non è disponibile in questo browser. Puoi continuare a esplorare la fotografia di Materia.";
  }
}
sceneDialog.addEventListener("close", async () => {
  if (sceneModule && !sceneDialog.open)
    (await sceneModule.catch(() => null))?.suspend();
  if (
    productOpener &&
    document.activeElement === document.body &&
    document.contains(productOpener)
  )
    productOpener.focus();
});
document.addEventListener("click", (event) => {
  const target = event.target.closest("button,a");
  if (!target) return;
  if (target.hasAttribute("data-product"))
    openProduct(target.dataset.product, target);
  else if (target.hasAttribute("data-favorite")) {
    const slug = target.dataset.favorite;
    if (!knownSlugs.has(slug)) return;
    if (wishlist.has(slug)) wishlist.delete(slug);
    else wishlist.add(slug);
    saveState();
    if (browseDialog.open && browseMode === "wishlist") renderBrowse();
  } else if (target.hasAttribute("data-open-panel"))
    openBrowse(target.dataset.openPanel);
  else if (target.hasAttribute("data-open-look"))
    openBrowse("look", target.dataset.openLook);
  else if (target.hasAttribute("data-open-scene")) openScene();
  else if (target.hasAttribute("data-category-filter")) {
    category = target.dataset.categoryFilter;
    collection = "Tutti";
    filterCatalog();
  } else if (target.hasAttribute("data-collection-filter")) {
    collection = target.dataset.collectionFilter;
    category = null;
    filterCatalog();
  } else if (target.hasAttribute("data-show-all")) {
    event.preventDefault();
    collection = "Tutti";
    category = null;
    filterCatalog();
  } else if (target.hasAttribute("data-carousel-direction"))
    track.scrollBy({
      left: Number(target.dataset.carouselDirection) * track.clientWidth * 0.8,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  else if (target.hasAttribute("data-cart-slug")) {
    const slug = target.dataset.cartSlug,
      quantity = (cart.get(slug) || 0) + Number(target.dataset.cartStep);
    if (quantity <= 0) cart.delete(slug);
    else cart.set(slug, Math.min(99, quantity));
    saveState();
    renderBrowse();
  } else if (target.hasAttribute("data-remove-cart")) {
    cart.delete(target.dataset.removeCart);
    saveState();
    renderBrowse();
  }
});
