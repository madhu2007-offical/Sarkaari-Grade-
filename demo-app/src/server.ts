import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.DEMO_APP_PORT) || 3001;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// In-memory cart
const carts = new Map<string, { id: string; name: string; price: number }[]>();

function getCartId(req: express.Request): string {
  return (req.headers["x-session-id"] as string) || "default";
}

app.get("/api/products", (_req, res) => {
  res.json([
    { id: "p1", name: "Govt Exam Guide", price: 499 },
    { id: "p2", name: "Sarkaari Grade T-Shirt", price: 799 },
    { id: "p3", name: "Mock Test Pack", price: 299 },
  ]);
});

app.get("/api/cart", (req, res) => {
  const cartId = getCartId(req);
  res.json(carts.get(cartId) || []);
});

app.post("/api/cart", (req, res) => {
  const cartId = getCartId(req);
  const { productId, name, price } = req.body;
  const cart = carts.get(cartId) || [];
  cart.push({ id: productId, name, price });
  carts.set(cartId, cart);
  res.json(cart);
});

// Bug 1: empty cart checkout throws error instead of friendly message
app.post("/api/checkout", (req, res) => {
  const cartId = getCartId(req);
  const cart = carts.get(cartId) || [];
  if (cart.length === 0) {
    throw new Error("Cannot checkout: cart is empty");
  }
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  carts.set(cartId, []);
  res.json({ success: true, total, orderId: `ORD-${Date.now()}` });
});

// Bug 2: contact form accepts empty required field silently
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;
  // Missing validation - accepts empty name silently
  res.json({ success: true, received: { name: name || "", email, message } });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Demo app running at http://localhost:${PORT}`);
});
