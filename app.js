const PROJECT_ID = "online-shopping-5a1d9";
const FIREBASE_API_KEY = "AIzaSyAXIr4U4eKq57_l2XMg8xWOfB17SY6hhvQ";
const COLLECTION_PRODUCTS = "Products Shopping";
const COLLECTION_ORDERS = "Orders";
const COLLECTION_CUSTOMERS = "Users";

function getToken() { return sessionStorage.getItem("firebase_id_token"); }
function getEmail() { return sessionStorage.getItem("user_email"); }
function getName() { return sessionStorage.getItem("user_name"); }
function authHeaders() {
  return { "Content-Type": "application/json" }; 
}
function fsURL(col) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}?key=${FIREBASE_API_KEY}`;
}
function toFields(obj) {
  const f = {};
  for (const k in obj) {
    const v = obj[k];
    if (typeof v === "string") f[k] = { stringValue: v };
    else if (Number.isInteger(v)) f[k] = { integerValue: String(v) };
    else if (typeof v === "number") f[k] = { doubleValue: v };
    else if (typeof v === "boolean") f[k] = { booleanValue: v };
    else f[k] = { stringValue: JSON.stringify(v) };
  }
  return f;
}
function fromFields(fields) {
  const out = {};
  for (const k in fields) {
    const v = fields[k];
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
  }
  return out;
}

if (!getToken()) {
  alert("Please sign in first.");
  window.location.href = "index.html";
}

// Elements
const productsGrid = document.getElementById("products-grid");
const searchBar = document.getElementById("search-bar");
const paginationDiv = document.getElementById("pagination");
const cartModal = document.getElementById("cart-modal");
const cartItemsDiv = document.getElementById("cart-items");
const cartTotalSpan = document.getElementById("cart-total");
const cartCount = document.getElementById("cart-count");
const viewCartBtn = document.getElementById("view-cart");
const ordersSection = document.getElementById("orders-section");
const ordersList = document.getElementById("orders-list");
const userMini = document.getElementById("user-mini");

userMini.innerHTML = `<strong>${getName()}</strong><br/><small>${getEmail()}</small>`;

let allProducts = [];
let filtered = [];
let currentPage = 1;
const perPage = 6;
let cart = JSON.parse(sessionStorage.getItem("cart") || "[]");
updateCartCountUI();

async function loadProducts() {
  try {
    const res = await axios.get(fsURL(COLLECTION_PRODUCTS));
    const docs = res.data.documents || [];
    allProducts = docs.map(d => {
      const obj = fromFields(d.fields);
      obj._docName = d.name;
      obj.id = d.name.split("/").pop();
      obj.price = Number(obj.price || 0);
      obj.qty = Number(obj.qty || 0);
      return obj;
    });
    applyFilter();
  } catch (err) {
    console.error("Error loading products", err);
    productsGrid.innerHTML = "<p style='color:red'>Failed to load products.</p>";
  }
}

function applyFilter() {
  const q = (searchBar.value || "").toLowerCase();
  filtered = allProducts.filter(p =>
    (p.name || "").toLowerCase().includes(q) ||
    (p.category || "").toLowerCase().includes(q)
  );
  renderPage();
}

function renderPage() {
  const total = Math.max(1, Math.ceil(filtered.length / perPage));
  if (currentPage > total) currentPage = total;
  const start = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  productsGrid.innerHTML = pageItems.map(p => `
    <article class="product">
      <img src="${p.imageURL || "https://via.placeholder.com/320x180?text=No+Image"}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p class="muted">${p.description || ""}</p>
      <p><strong>₹${p.price}</strong> • Stock: ${p.qty}</p>
      <div class="row">
        <input type="number" id="qty-${p.id}" min="1" value="1" class="qty-input"/>
        <button onclick="addToCart('${p.id}')">Add to Cart</button>
      </div>
    </article>`).join("");

  paginationDiv.innerHTML = `
    <button ${currentPage === 1 ? "disabled" : ""} onclick="prevPage()">Prev</button>
    <span>Page ${currentPage} / ${total}</span>
    <button ${currentPage === total ? "disabled" : ""} onclick="nextPage()">Next</button>
  `;
}

window.prevPage = () => { if (currentPage > 1) currentPage--; renderPage(); };
window.nextPage = () => { currentPage++; renderPage(); };
searchBar.addEventListener("input", () => { currentPage = 1; applyFilter(); });

function findProductById(id) { return allProducts.find(p => p.id === id); }
function saveCart() { sessionStorage.setItem("cart", JSON.stringify(cart)); updateCartCountUI(); }
function updateCartCountUI() { cartCount.innerText = cart.reduce((s, c) => s + c.qty, 0); }

window.addToCart = function (id) {
  const qtyEl = document.getElementById(`qty-${id}`);
  const qty = Math.max(1, parseInt(qtyEl?.value || "1", 10));
  const prod = findProductById(id);
  if (!prod) return alert("Item not found");
  if (prod.qty < qty) return alert(`Only ${prod.qty} available`);
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty += qty;
  else cart.push({ id, name: prod.name, price: prod.price, qty });
  saveCart();
  alert("Added to cart");
};

window.buyNow = async function (id) {
  const prod = findProductById(id);
  if (!prod) return alert("Item not found");
  const qty = Math.max(1, parseInt(document.getElementById(`qty-${id}`).value || "1", 10));
  if (prod.qty < qty) return alert("Insufficient stock");

  const order = {
    customerEmail: getEmail(),
    createdAt: new Date().toISOString(),
    items: JSON.stringify([{ id: prod.id, name: prod.name, qty, price: prod.price }]),
    total: prod.price * qty,
    paymentMethod: "cash",
    status: "completed"
  };

  try {
    await axios.post(`${fsURL(COLLECTION_ORDERS)}&documentId=${crypto.randomUUID()}`, { fields: toFields(order) });
    await axios.patch(`${prod._docName}?updateMask.fieldPaths=qty&key=${FIREBASE_API_KEY}`,
      { fields: { qty: { integerValue: String(prod.qty - qty) } } });
    alert("Purchase successful!");
    await loadProducts();
    loadOrders();
  } catch (err) {
    console.error("BuyNow Error:", err.response?.data || err);
    alert("Purchase failed (see console)");
  }
};

viewCartBtn.addEventListener("click", openCartModal);
document.getElementById("cart-close").addEventListener("click", () => (cartModal.style.display = "none"));

function openCartModal() {
  cartItemsDiv.innerHTML = "";
  if (cart.length === 0) {
    cartItemsDiv.innerHTML = "<p>Your cart is empty.</p>";
  } else {
    let total = 0;
    cart.forEach((it, idx) => {
      const prod = findProductById(it.id) || {};
      const price = prod.price || it.price || 0;
      total += it.qty * price;
      const el = document.createElement("div");
      el.className = "cart-row";
      el.innerHTML = `
        <div><strong>${it.name}</strong> <small>₹${price}</small></div>
        <div class="row">
          <input type="number" min="1" value="${it.qty}" data-idx="${idx}" class="cart-qty" />
          <button data-remove="${idx}">Remove</button>
        </div>`;
      cartItemsDiv.appendChild(el);
    });
    cartTotalSpan.innerText = total;
  }
  const detailsDiv = document.createElement("div");
  detailsDiv.className = "user-details";
  detailsDiv.innerHTML = `
    <hr>
    <h4>Your Details</h4>
    <p><strong>Name:</strong> ${getName()}</p>
    <p><strong>Email:</strong> ${getEmail()}</p>
  `;
  cartItemsDiv.appendChild(detailsDiv);

  cartModal.style.display = "flex";

  cartItemsDiv.querySelectorAll(".cart-qty").forEach(inp => {
    inp.addEventListener("change", e => {
      const idx = Number(e.target.dataset.idx);
      const newQty = Math.max(1, Number(e.target.value));
      cart[idx].qty = newQty;
      saveCart();
      openCartModal();
    });
  });
  cartItemsDiv.querySelectorAll("[data-remove]").forEach(b => {
    b.addEventListener("click", e => {
      const idx = Number(e.target.dataset.remove);
      cart.splice(idx, 1);
      saveCart();
      openCartModal();
    });
  });
}

document.getElementById("checkout-cash").addEventListener("click", () => checkout("cash"));
document.getElementById("checkout-credit").addEventListener("click", () => checkout("credit"));

function checkout(paymentType) {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const order = {
    items: [...cart],
    total,
    paymentType,
    date: new Date().toLocaleString(),
  };

  const orders = JSON.parse(localStorage.getItem("orders") || "[]");
  orders.push(order);

  localStorage.setItem("orders", JSON.stringify(orders));

  alert(`Payment Successful using ${paymentType.toUpperCase()}`);
  cart = []; // clear the cart
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  document.getElementById("cart-modal").style.display = "none";
}
function buyNow(product) {
  const singleOrder = {
    items: [product],
    total: product.price,
    paymentType: null,
    date: new Date().toLocaleString(),
  };

  const paymentType = prompt("Enter payment type: cash or credit").toLowerCase();

  if (paymentType !== "cash" && paymentType !== "credit") {
    alert("Invalid payment type. Please enter 'cash' or 'credit'.");
    return;
  }

  singleOrder.paymentType = paymentType;

  const orders = JSON.parse(localStorage.getItem("orders") || "[]");
  orders.push(singleOrder);
  localStorage.setItem("orders", JSON.stringify(orders));

  alert(`Payment Successful using ${paymentType.toUpperCase()}`);
}


async function loadOrders() {
  try {
    const res = await axios.get(fsURL(COLLECTION_ORDERS));
    const docs = res.data.documents || [];
    const orders = docs
      .map(d => ({ ...fromFields(d.fields), id: d.name.split("/").pop() }))
      .filter(o => o.customerEmail === getEmail())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (orders.length === 0) {
      ordersSection.style.display = "none";
    } else {
      ordersSection.style.display = "block";
      ordersList.innerHTML = orders.map(o => `
        <div class="order-row">
          <div><strong>₹${o.total}</strong> • ${o.paymentMethod} • ${new Date(o.createdAt).toLocaleString()}</div>
          <div>${o.items}</div>
        </div>`).join("");
    }
  } catch (err) {
    console.error("Orders Error:", err.response?.data || err);
  }
}

loadProducts();
loadOrders();




