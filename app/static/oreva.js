const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
  navigation.classList.toggle("open", open);
});
navigation.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Apri menu");
  }),
);
const cards = [...document.querySelectorAll(".product")];
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((other) => {
      const active = other === button;
      other.classList.toggle("active", active);
      other.setAttribute("aria-pressed", String(active));
    });
    let count = 0;
    cards.forEach((card) => {
      card.hidden =
        button.dataset.filter !== "Tutti" &&
        card.dataset.category !== button.dataset.filter;
      if (!card.hidden) count += 1;
    });
    document.querySelector("#catalog-count").textContent =
      count + (count === 1 ? " creazione" : " creazioni");
  }),
);
const productDialog = document.querySelector("#product-dialog");
const sceneDialog = document.querySelector("#scene-dialog");
const status = document.querySelector("#product-status");
const details = document.querySelector("#product-detail");
let requestController;
let sceneModule;
let productOpener;
const euros = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
function synchronizeBody() {
  document.body.classList.toggle(
    "dialog-open",
    Boolean(document.querySelector("dialog[open]")),
  );
}
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", synchronizeBody);
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
});
productDialog.addEventListener("close", () => requestController?.abort());
document.querySelectorAll("[data-product]").forEach((button) =>
  button.addEventListener("click", async () => {
    productOpener = button;
    requestController?.abort();
    requestController = new AbortController();
    const controller = requestController;
    details.hidden = true;
    status.hidden = false;
    status.textContent = "Caricamento del gioiello…";
    productDialog.showModal();
    synchronizeBody();
    try {
      const response = await fetch(
        "/api/jewels/" + encodeURIComponent(button.dataset.product),
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("Impossibile caricare il gioiello.");
      const product = await response.json();
      if (!productDialog.open || controller.signal.aborted) return;
      document.querySelector("#product-title").textContent = product.name;
      document.querySelector("#detail-category").textContent =
        product.category.toUpperCase() +
        " — COLLEZIONE " +
        product.collection.toUpperCase();
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
  }),
);
document.querySelectorAll("[data-open-scene]").forEach((button) =>
  button.addEventListener("click", async () => {
    if (productDialog.open) productDialog.close();
    sceneDialog.showModal();
    synchronizeBody();
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
  }),
);
sceneDialog.addEventListener("close", async () => {
  if (sceneModule && !sceneDialog.open)
    (await sceneModule.catch(() => null))?.suspend();
  if (productOpener && document.activeElement === document.body)
    productOpener.focus();
});
