// app.js - user product listing, cart, checkout, order history
const PROJECT_ID = "online-shopping-5a1d9";
const COLLECTION_PRODUCTS = "Products Shopping";
const COLLECTION_ORDERS = "Orders";
const COLLECTION_CUSTOMERS = "Users";

function getToken() { return sessionStorage.getItem("firebase_id_token"); }
function getEmail() { return sessionStorage.getItem("user_email"); }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${//"ya29.a0AQQ_BDTEA-p5-0zoWg4eKVp5k1_cfRVnKMMcRWXLjfYF1TGx6BZA3gGcU7IehjMtYoSFD01MbgO3uZ6CtUp8yJhm21WVAa67Hi-BZNsucJz3pftfR3lXrCHm2A_IFv9mNn2UEaRweul6YrWKzVMbFKaebblbtPwnv5jXiFrR_qssg5HQriJWdnRNkofos2cA__cAAFcaCgYKAQgSARESFQHGX2Mi912baazITZYzsiQzxN-2Vg0206"}` } : {}; }
function fsURL(col) { return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}`; 
}
function toFields(obj){ const f={}; for(const k in obj){ const v=obj[k]; if(typeof v==='string') f[k]={stringValue:v}; else if(Number.isInteger(v)) f[k]={integerValue:String(v)} 
else if(typeof v==='number') f[k]={doubleValue:v}; else if(typeof v==='boolean') f[k]={booleanValue:v}; else f[k]={stringValue:JSON.stringify(v),} } return f; }
function fromFields(fields){ const out={}; for(const k in fields){ const v=fields[k]; if(v.stringValue!==undefined) out[k]=v.stringValue; else if(v.integerValue!==undefined) out[k]=parseInt(v.integerValue,10); else if(v.doubleValue!==undefined) out[k]=v.doubleValue; else if(v.booleanValue!==undefined) out[k]=v.booleanValue; else out[k]=v; } return out; }

if (!getToken()) {
  alert("Please sign in first.");
  window.location.href = "index.html";
}

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

userMini.innerHTML = `<strong>${sessionStorage.getItem("user_name")||""}</strong><br/><small>${getEmail()}</small>`;

let allProducts = [];
let filtered = [];
let currentPage = 1;
const perPage = 6;
let cart = JSON.parse(sessionStorage.getItem("cart") || "[]");
updateCartCountUI();

async function loadProducts() {
  try {
    const res = await axios.get(fsURL(COLLECTION_PRODUCTS), { headers: authHeaders() });
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
    console.error(err);
    productsGrid.innerHTML = "<p style='color:red'>Failed to load products.</p>";
  }
}

function applyFilter() {
  const q = (searchBar.value || "").toLowerCase();
  filtered = allProducts.filter(p => (p.name||"").toLowerCase().includes(q) || (p.category||"").toLowerCase().includes(q));
  renderPage();
}

function renderPage() {
  const total = Math.max(1, Math.ceil(filtered.length / perPage));
  if (currentPage > total) currentPage = total;
  const start = (currentPage-1)*perPage;
  const pageItems = filtered.slice(start, start+perPage);
  productsGrid.innerHTML = pageItems.map(p => `
    <article class="product">
      <img src="${p.imageURL || 'https://via.placeholder.com/320x180'}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p class="muted">${p.description || ''}</p>
      <p><strong>₹${p.price}</strong> • Stock: ${p.qty}</p>
      <div class="row">
        <input type="number" id="qty-${p.id}" min="1" value="1" class="qty-input"/>
        <button onclick="addToCart('${p.id}')">Add to cart</button>
        <button onclick="buyNow('${p.id}')">Buy now</button>
      </div>
    </article>
  `).join("");

  paginationDiv.innerHTML = `
    <button ${currentPage===1?'disabled':''} onclick="prevPage()">Prev</button>
    <span>Page ${currentPage} / ${total}</span>
    <button ${currentPage===total?'disabled':''} onclick="nextPage()">Next</button>
  `;
}


window.prevPage = () => { if (currentPage>1) currentPage--; renderPage(); };
window.nextPage = () => { currentPage++; renderPage(); };

searchBar.addEventListener("input", ()=>{ currentPage=1; applyFilter(); });

function findProductById(id){ return allProducts.find(p => p.id===id); }
function saveCart(){ sessionStorage.setItem("cart", JSON.stringify(cart)); updateCartCountUI(); }
function updateCartCountUI(){ cartCount.innerText = cart.reduce((s,c)=>s+c.qty,0); }

window.addToCart = function(id){
  const qtyEl = document.getElementById(`qty-${id}`);
  const qty = Math.max(1, parseInt(qtyEl?.value||"1",10));
  const prod = findProductById(id);
  if (!prod) { alert("Item not found"); return; }
  if (prod.qty < qty) { alert(`Only ${prod.qty} available`); return; }
  const ex = cart.find(c=>c.id===id);
  if (ex) ex.qty += qty; else cart.push({ id, name: prod.name, price: prod.price, qty });
  saveCart();
  alert("Added to cart");
};

window.buyNow = async function(id){
  const prod = findProductById(id);
  if (!prod) return alert("Item not found");
  const qty = Math.max(1, parseInt(document.getElementById(`qty-${id}`).value||"1",10));
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
    await axios.post(fsURL(COLLECTION_ORDERS), { fields: toFields(order) }, { headers: authHeaders() });
    await axios.patch(prod._docName + `?updateMask.fieldPaths=qty`, { fields: { qty: { integerValue: String(prod.qty - qty) } } }, { headers: authHeaders() });
    alert("Purchase successful!");
    await loadProducts();
  } catch (err) {
    console.error(err);
    alert("Purchase failed (see console)");
  }
};

viewCartBtn.addEventListener("click", () => {
  openCartModal();
});
document.getElementById("cart-close").addEventListener("click", () => { cartModal.style.display = "none"; });

function openCartModal(){
  cartItemsDiv.innerHTML = "";
  if (cart.length === 0) cartItemsDiv.innerHTML = "<p>Your cart is empty.</p>";
  let total = 0;
  cart.forEach((it, idx) => {
    const prod = findProductById(it.id) || {};
    total += it.qty * (prod.price || it.price || 0);
    const el = document.createElement("div");
    el.className = "cart-row";
    el.innerHTML = `
      <div><strong>${it.name}</strong> <small>₹${prod.price || it.price}</small></div>
      <div class="row">
        <input type="number" min="1" value="${it.qty}" data-idx="${idx}" class="cart-qty" />
        <button data-remove="${idx}">Remove</button>
      </div>
    `;
    cartItemsDiv.appendChild(el);
  });
  cartTotalSpan.innerText = total;
  cartModal.style.display = "flex";

  cartItemsDiv.querySelectorAll(".cart-qty").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.idx);
      const newQty = Math.max(1, Number(e.target.value));
      cart[idx].qty = newQty;
      saveCart();
      openCartModal(); 
    });
  });
  cartItemsDiv.querySelectorAll("[data-remove]").forEach(b => {
    b.addEventListener("click", (e) => {
      const idx = Number(e.target.dataset.remove);
      cart.splice(idx,1);
      saveCart();
      openCartModal();
    });
  });
}

document.getElementById("checkout-cash").addEventListener("click", async () => checkout("cash"));
document.getElementById("checkout-credit").addEventListener("click", async () => checkout("credit"));

async function checkout(method) {
  if (cart.length === 0) return alert("Cart empty");

  let total = 0;
  for (const it of cart) {
    const prod = findProductById(it.id);
    if (!prod) return alert(`Product ${it.name} removed`);
    if (prod.qty < it.qty) return alert(`Not enough stock for ${prod.name}`);
    total += prod.price * it.qty;
  }
  
  if (method === "credit") {
    const custId = getEmail().replace(/[@.]/g,"_");
    try {
      const res = await axios.get(`${fsURL(COLLECTION_CUSTOMERS)}/${encodeURIComponent(custId)}`, { headers: authHeaders() });
      const cust = fromFields(res.data.fields);
      const used = Number(cust.usedCredit || 0);
      const limit = Number(cust.creditLimit || 1000);
      if (total > (limit - used)) return alert(`Insufficient credit. Available ₹${limit - used}`);
    } catch (err) {
      // no customer doc -> will create when using credit
    }
  }

  // create order
  const orderObj = {
    customerEmail: getEmail(),
    createdAt: new Date().toISOString(),
    items: JSON.stringify(cart),
    total,
    paymentMethod: method,
    status: "completed"
  };
  try {
    await axios.post(fsURL(COLLECTION_ORDERS), { fields: toFields(orderObj) }, { headers: authHeaders() });
    // update product quantities
    for (const it of cart) {
      const prod = findProductById(it.id);
      await axios.patch(prod._docName + `?updateMask.fieldPaths=qty`, { fields: { qty: { integerValue: String(prod.qty - it.qty) } } }, { headers: authHeaders() });
    }
    // update customer credit if method credit
    if (method === "credit") {
      const custId = getEmail().replace(/[@.]/g,"_");
      try {
        const res = await axios.get(`${fsURL(COLLECTION_CUSTOMERS)}/${encodeURIComponent(custId)}`, { headers: authHeaders() });
        const cust = fromFields(res.data.fields);
        const used = Number(cust.usedCredit || 0) + total;
        await axios.patch(res.data.name + `?updateMask.fieldPaths=usedCredit`, { fields: { usedCredit: { doubleValue: used } } }, { headers: authHeaders() });
      } catch (err) {
        // create doc
        await axios.post(`${fsURL(COLLECTION_CUSTOMERS)}?documentId=${encodeURIComponent(getEmail().replace(/[@.]/g,"_"))}`, { fields: toFields({ email: getEmail(), creditLimit: 1000, usedCredit: total }) }, { headers: authHeaders() });
      }
    }

    // clear cart
    cart = [];
    saveCart();
    cartModal.style.display = "none";
    alert("Order placed successfully");
    await loadProducts();
    loadOrders();
  } catch (err) {
    console.error(err);
    alert("Checkout failed (see console)");
  }
}

// Orders (order history)
async function loadOrders() {
  try {
    const res = await axios.get(fsURL(COLLECTION_ORDERS), { headers: authHeaders() });
    const docs = res.data.documents || [];
    const orders = docs.map(d => ({
      ...fromFields(d.fields),
      id: d.name.split("/").pop()
    })).filter(o => (o.customerEmail || "") === getEmail())
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (orders.length === 0) {
      ordersSection.style.display = "none";
    } else {
      ordersSection.style.display = "block";
      ordersList.innerHTML = orders.map(o => `<div class="order-row"><div><strong>₹${o.total}</strong> • ${o.paymentMethod} • ${o.createdAt}</div><div>${o.items}</div></div>`).join("");
    }
  } catch (err) {
    console.error(err);
  }
}

// initial load
loadProducts();
loadOrders();
