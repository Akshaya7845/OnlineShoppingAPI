const PROJECT_ID = "online-shopping-5a1d9";
const FIREBASE_API_KEY = "AIzaSyAXIr4U4eKq57_l2XMg8xWOfB17SY6hhvQ";
const COLLECTION_PRODUCTS = "Products Shopping";
const COLLECTION_ORDERS = "Orders";
const COLLECTION_CUSTOMERS = "Users";
const ADMIN_EMAIL = "akshayamurugan0406@gmail.com";

function getToken() {
  return sessionStorage.getItem("firebase_id_token");
}
function getEmail() {
  return sessionStorage.getItem("user_email");
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
    else out[k] = v;
  }
  return out;
}

if (!getToken()) {
  alert("Please sign in first.");
  window.location.href = "index.html";
}
if ((getEmail() || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
  alert("Not authorized to access admin panel.");
  window.location.href = "index.html";
}

const adminList = document.getElementById("admin-list");
const adminSearch = document.getElementById("admin-search");
const adminPagination = document.getElementById("admin-pagination");
const reportOutput = document.getElementById("report-output");

document.getElementById("btn-create").addEventListener("click", async () => {
  const id = document.getElementById("p-id").value.trim();
  const name = document.getElementById("p-name").value.trim();
  const cat = document.getElementById("p-cat").value.trim();
  const price = Number(document.getElementById("p-price").value || 0);
  const qty = Number(document.getElementById("p-qty").value || 0);
  const image = document.getElementById("p-image").value.trim();
  const desc = document.getElementById("p-desc").value.trim();

  if (!name) return alert("Please provide a product name.");

  const payload = {
    fields: toFields({
      name,
      category: cat,
      price,
      qty,
      imageURL: image,
      description: desc,
      active: true,
    }),
  };

  try {
    if (id) {
      await axios.post(
        `${fsURL(COLLECTION_PRODUCTS)}&documentId=${encodeURIComponent(id)}`,
        payload
      );
    } else {
      await axios.post(fsURL(COLLECTION_PRODUCTS), payload);
    }
    alert("Product created successfully!");
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Product creation failed. Check console for details.");
  }
});

document.getElementById("btn-refresh").addEventListener("click", loadProducts);

let items = [];
let page = 1;
const perPage = 8;

adminSearch.addEventListener("input", () => {
  page = 1;
  renderList();
});

async function loadProducts() {
  try {
    const res = await axios.get(fsURL(COLLECTION_PRODUCTS));
    const docs = res.data.documents || [];
    items = docs.map((d) => {
      const o = fromFields(d.fields);
      o._docName = d.name;
      o.id = d.name.split("/").pop();
      o.price = Number(o.price || 0);
      o.qty = Number(o.qty || 0);
      return o;
    });
    renderList();
  } catch (err) {
    console.error(err);
    adminList.innerHTML = "<p style='color:red'>Failed to load inventory.</p>";
  }
}

function renderList() {
  const q = (adminSearch.value || "").toLowerCase();
  const filtered = items.filter(
    (i) =>
      (i.name || "").toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q)
  );
  const total = Math.max(1, Math.ceil(filtered.length / perPage));
  if (page > total) page = total;
  const start = (page - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);

  adminList.innerHTML = slice
    .map(
      (it) => `
      <div class="product admin-product">
        <img src="${it.imageURL || "https://via.placeholder.com/200"}" alt="${it.name}">
        <div class="admin-meta">
          <input data-doc="${it._docName}" data-field="name" value="${it.name}" />
          <input data-doc="${it._docName}" data-field="category" value="${it.category || ""}" />
          <input data-doc="${it._docName}" data-field="price" value="${it.price}" type="number" />
          <input data-doc="${it._docName}" data-field="qty" value="${it.qty}" type="number" />
          <input data-doc="${it._docName}" data-field="imageURL" value="${it.imageURL || ""}" />
          <textarea data-doc="${it._docName}" data-field="description">${it.description || ""}</textarea>
          <div class="row">
            <button class="save-btn" data-doc="${it._docName}">Save</button>
            <button class="toggle-btn" data-doc="${it._docName}">
              ${it.active === "true" || it.active === true ? "Deactivate" : "Activate"}
            </button>
            <button class="delete-btn" data-doc="${it._docName}">Delete</button>
          </div>
        </div>
      </div>`
    )
    .join("");

  adminPagination.innerHTML = `
    <button ${page === 1 ? "disabled" : ""} onclick="adminPrev()">Prev</button>
    <span>Page ${page}/${total}</span>
    <button ${page === total ? "disabled" : ""} onclick="adminNext()">Next</button>
  `;

  document.querySelectorAll(".save-btn").forEach((b) =>
    b.addEventListener("click", onAdminSave)
  );
  document.querySelectorAll(".toggle-btn").forEach((b) =>
    b.addEventListener("click", onAdminToggle)
  );
  document.querySelectorAll(".delete-btn").forEach((b) =>
    b.addEventListener("click", onAdminDelete)
  );
}

window.adminPrev = () => {
  if (page > 1) page--;
  renderList();
};
window.adminNext = () => {
  page++;
  renderList();
};

async function onAdminSave(e) {
  const doc = e.currentTarget.dataset.doc;
  const container = e.currentTarget.closest(".admin-product");
  const inputs = container.querySelectorAll("[data-field]");
  const fields = {};

  inputs.forEach((inp) => {
    const f = inp.dataset.field;
    const v = inp.value;
    if (f === "price")
      fields[f] = { doubleValue: Number(v || 0) };
    else if (f === "qty")
      fields[f] = { integerValue: String(Number(v || 0)) };
    else fields[f] = { stringValue: v };
  });

  try {
    await axios.patch(
      `${doc}?updateMask.fieldPaths=name&updateMask.fieldPaths=category&updateMask.fieldPaths=price&updateMask.fieldPaths=qty&updateMask.fieldPaths=imageURL&updateMask.fieldPaths=description&key=${FIREBASE_API_KEY}`,
      { fields }
    );
    alert("Product updated.");
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Save failed.");
  }
}

async function onAdminToggle(e) {
  const doc = e.currentTarget.dataset.doc;
  try {
    const res = await axios.get(`${doc}?key=${FIREBASE_API_KEY}`);
    const cur = fromFields(res.data.fields);
    const now = !(cur.active === "true" || cur.active === true);
    await axios.patch(
      `${doc}?updateMask.fieldPaths=active&key=${FIREBASE_API_KEY}`,
      { fields: { active: { booleanValue: now } } }
    );
    alert("Toggled active state.");
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Toggle failed.");
  }
}

async function onAdminDelete(e) {
  const doc = e.currentTarget.dataset.doc;
  if (!confirm("Delete permanently?")) return;
  try {
    await axios.delete(`${doc}?key=${FIREBASE_API_KEY}`);
    alert("Product deleted.");
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Delete failed.");
  }
}

document.getElementById("report-inventory").addEventListener("click", async () => {
  try {
    const res = await axios.get(fsURL(COLLECTION_PRODUCTS));
    const docs = res.data.documents || [];
    const products = docs.map((d) => fromFields(d.fields));
    const low = products.filter((p) => Number(p.qty || 0) < 15);
    const high = products.filter((p) => Number(p.qty || 0) > 100);
    reportOutput.innerHTML = `
      <p>Total products: ${products.length}</p>
      <p>Low stock (&lt;15): ${low.length}</p>
      <p>High stock (&gt;100): ${high.length}</p>
      <h4>Low stock items</h4>
      <ul>${low.map((x) => `<li>${x.name} - ${x.qty}</li>`).join("")}</ul>
    `;
  } catch (err) {
    console.error(err);
    alert("Failed to generate inventory report.");
  }
});

document.getElementById("report-sales").addEventListener("click", async () => {
  try {
    const res = await axios.get(fsURL(COLLECTION_ORDERS));
    const docs = res.data.documents || [];
    const orders = docs.map((d) => fromFields(d.fields));
    const totalSales = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    reportOutput.innerHTML = `
      <p>Total orders: ${orders.length}</p>
      <p>Total sales: ₹${totalSales}</p>
    `;
  } catch (err) {
    console.error(err);
    alert("Failed to generate sales report.");
  }
});

loadProducts();
