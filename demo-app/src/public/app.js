const API = "";
const sessionId = crypto.randomUUID();

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// Heal demo: ?breakSelector=checkout renames checkout button
const params = new URLSearchParams(window.location.search);
if (params.get("breakSelector") === "checkout") {
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("checkout-btn");
    if (btn) {
      btn.id = "broken-checkout-btn";
      btn.removeAttribute("aria-label");
      btn.textContent = "Proceed to Payment";
    }
  });
}

async function loadProducts() {
  const products = await api("/api/products");
  const list = document.getElementById("product-list");
  list.innerHTML = products
    .map(
      (p) => `
    <div class="product-card" data-product-id="${p.id}">
      <h3>${p.name}</h3>
      <p>₹${p.price}</p>
      <button type="button" role="button" aria-label="Add ${p.name} to cart"
        onclick="addToCart('${p.id}', '${p.name}', ${p.price})">
        Add to Cart
      </button>
    </div>`
    )
    .join("");
}

async function addToCart(productId, name, price) {
  await api("/api/cart", {
    method: "POST",
    body: JSON.stringify({ productId, name, price }),
  });
  await refreshCart();
}

async function refreshCart() {
  const cart = await api("/api/cart");
  const list = document.getElementById("cart-items");
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  list.innerHTML = cart
    .map((item) => `<li>${item.name} — ₹${item.price}</li>`)
    .join("");
  document.getElementById("cart-total").textContent = `Total: ₹${total}`;
}

async function checkout() {
  const errorEl = document.getElementById("checkout-error");
  const successEl = document.getElementById("checkout-success");
  errorEl.hidden = true;
  successEl.hidden = true;
  try {
    const result = await api("/api/checkout", { method: "POST", body: "{}" });
    successEl.textContent = `Order placed! ID: ${result.orderId}, Total: ₹${result.total}`;
    successEl.hidden = false;
    await refreshCart();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

document.getElementById("checkout-btn")?.addEventListener("click", checkout);

document.getElementById("contact-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("contact-status");
  status.hidden = true;
  const name = document.getElementById("contact-name").value;
  const email = document.getElementById("contact-email").value;
  const message = document.getElementById("contact-message").value;
  // Bug 2: no client-side validation either
  const result = await api("/api/contact", {
    method: "POST",
    body: JSON.stringify({ name, email, message }),
  });
  status.textContent = `Submitted! Name received: "${result.received.name}"`;
  status.hidden = false;
});

loadProducts();
refreshCart();
