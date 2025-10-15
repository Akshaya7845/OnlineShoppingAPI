const PROJECT_ID = "online-shopping-5a1d9";
const COLLECTION_PRODUCTS = "Products Shopping";
const COLLECTION_ORDERS = "Orders";
const COLLECTION_CUSTOMERS = "Users";
const ADMIN_EMAIL = "akshayamurugan0406@gmail.com";

function getToken(){ 
  return sessionStorage.getItem("firebase_id_token"); 
}
function getEmail(){ r
  return sessionStorage.getItem("user_email"); 
}
function headers(){ const t=getToken(); return t?{ 
  Authorization:`Bearer ${//"ya29.a0AQQ_BDTEA-p5-0zoWg4eKVp5k1_cfRVnKMMcRWXLjfYF1TGx6BZA3gGcU7IehjMtYoSFD01MbgO3uZ6CtUp8yJhm21WVAa67Hi-BZNsucJz3pftfR3lXrCHm2A_IFv9mNn2UEaRweul6YrWKzVMbFKaebblbtPwnv5jXiFrR_qssg5HQriJWdnRNkofos2cA__cAAFcaCgYKAQgSARESFQHGX2Mi912baazITZYzsiQzxN-2Vg0206"}` } :
 {}//; }
function fsURL(col){ 
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}`; 
}
function toFields(obj){ const f={}; for(const k in obj)
{ const v=obj[k]; 
  if(typeof v==='string') 
  f[k]={stringValue:v}; 
  else if(Number.isInteger(v)) f[k]={integerValue:String(v)} 
else if(typeof v==='number') f[k]={doubleValue:v}; 
else if(typeof v==='boolean') 
f[k]={booleanValue:v}; 
else f[k]={stringValue:JSON.stringify(v)} 
} 
return f; 
}
function fromFields(fields){ const out={}; 
for(const k in fields){ const v=fields[k]; 
if(v.stringValue!==undefined) out[k]=v.stringValue; 
else if(v.integerValue!==undefined) out[k]=parseInt(v.integerValue,10); 
else if(v.doubleValue!==undefined) out[k]=v.doubleValue; 
else if(v.booleanValue!==undefined) out[k]=v.booleanValue; 
else out[k]=v; 
} 
return out; 
}
if (!getToken()) { alert("Sign in please"); window.location.href="index.html"; }
if ((getEmail()||"").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) { alert("Not authorized"); window.location.href="index.html"; }

const adminList = document.getElementById("admin-list");
const adminSearch = document.getElementById("admin-search");
const adminPagination = document.getElementById("admin-pagination");
const reportOutput = document.getElementById("report-output");

// create product
document.getElementById("btn-create").addEventListener("click", async () => {
  const id = document.getElementById("p-id").value.trim();
  const name = document.getElementById("p-name").value.trim();
  const cat = document.getElementById("p-cat").value.trim();
  const price = Number(document.getElementById("p-price").value || 0);
  const qty = Number(document.getElementById("p-qty").value || 0);
  const image = document.getElementById("p-image").value.trim();
  const desc = document.getElementById("p-desc").value.trim();
  if (!name) 
    return alert("Provide a name");
  const payload = { fields: toFields({ name, category: cat, price, qty, imageURL: image, description: desc, active: true }) };
  try {
    if (id) {
      await axios.post(`${fsURL(COLLECTION_PRODUCTS)}?documentId=${encodeURIComponent(id)}`, payload, { headers: headers() });
    } else {
      await axios.post(fsURL(COLLECTION_PRODUCTS), payload, { headers: headers() });
    }
    alert("Created product");
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Create failed. See console.");
  }
});
document.getElementById("btn-refresh").addEventListener("click", loadProducts);

// inventory list & paging
let items = [];
let page = 1;
const perPage = 8;

adminSearch.addEventListener("input", ()=> { page=1; renderList(); });

async function loadProducts() {
  try {
    const res = await axios.get(fsURL(COLLECTION_PRODUCTS), { headers: headers() });
    const docs = res.data.documents || [];
    items = docs.map(d => { const o=fromFields(d.fields); o._docName = d.name; o.id = d.name.split("/").pop(); o.price = Number(o.price||0); o.qty = Number(o.qty||0); return o; });
    renderList();
  } catch (err) {
    console.error(err);
    adminList.innerHTML = "<p style='color:red'>Failed to load inventory</p>";
  }
}

function renderList() {
  const q = (adminSearch.value || "").toLowerCase();
  const filtered = items.filter(i => (i.name||"").toLowerCase().includes(q) || (i.category||"").toLowerCase().includes(q));
  const total = Math.max(1, Math.ceil(filtered.length / perPage));
  if (page > total) page = total;
  const start = (page-1)*perPage;
  const slice = filtered.slice(start, start+perPage);
  adminList.innerHTML = slice.map(it => `
    <div class="product admin-product">
      <img src="${it.imageURL||'https://via.placeholder.com/200'}" alt="${it.name}">
      <div class="admin-meta">
        <input data-doc="${it._docName}" data-field="name" value="${it.name}" />
        <input data-doc="${it._docName}" data-field="category" value="${it.category||''}" />
        <input data-doc="${it._docName}" data-field="price" value="${it.price}" type="number" />
        <input data-doc="${it._docName}" data-field="qty" value="${it.qty}" type="number" />
        <input data-doc="${it._docName}" data-field="imageURL" value="${it.imageURL||''}" />
        <textarea data-doc="${it._docName}" data-field="description">${it.description||''}</textarea>
        <div class="row">
          <button class="save-btn" data-doc="${it._docName}">Save</button>
          <button class="toggle-btn" data-doc="${it._docName}">${it.active==='true'||it.active===true?'Deactivate':'Activate'}</button>
          <button class="delete-btn" data-doc="${it._docName}">Delete</button>
        </div>
      </div>
    </div>
  `).join("");
  adminPagination.innerHTML = `<button ${page===1?'disabled':''} onclick="adminPrev()">Prev</button> <span>Page ${page}/${total}</span> <button ${page===total?'disabled':''} onclick="adminNext()">Next</button>`;
  // wire events
  document.querySelectorAll(".save-btn").forEach(b => b.addEventListener("click", onAdminSave));
  document.querySelectorAll(".toggle-btn").forEach(b => b.addEventListener("click", onAdminToggle));
  document.querySelectorAll(".delete-btn").forEach(b => b.addEventListener("click", onAdminDelete));
}
window.adminPrev = ()=>{ if(page>1) page--; renderList(); };
window.adminNext = ()=>{ page++; renderList(); };

async function onAdminSave(e) {
  const doc = e.currentTarget.dataset.doc;
  const container = e.currentTarget.closest(".admin-product");
  const inputs = container.querySelectorAll("[data-field]");
  const fields = {};
  inputs.forEach(inp => { const f = inp.dataset.field; const v = inp.value; if (f==="price" || f==="qty") { if (f==="price") fields[f] = { doubleValue: Number(v||0) }; else fields[f] = { integerValue: String(Number(v||0)) }; } else fields[f] = { stringValue: v }; });
  try {
    await axios.patch(`${doc}?updateMask.fieldPaths=name&updateMask.fieldPaths=category&updateMask.fieldPaths=price&updateMask.fieldPaths=qty&updateMask.fieldPaths=imageURL&updateMask.fieldPaths=description`, { fields }, { headers: headers() });
    alert("Saved");
    loadProducts();
  } catch (err) {
    console.error(err);
    alert("Save failed");
  }
}

async function onAdminToggle(e) {
  const doc = e.currentTarget.dataset.doc;
  try {
    const res = await axios.get(doc, { headers: headers() });
    const cur = fromFields(res.data.fields);
    const now = !(cur.active==='true' || cur.active===true);
    await axios.patch(`${doc}?updateMask.fieldPaths=active`, { fields: { active: { booleanValue: now } } }, { headers: headers() });
    alert("Toggled");
    loadProducts();
  } catch (err) { console.error(err); alert("Toggle failed"); }
}

async function onAdminDelete(e) {
  const doc = e.currentTarget.dataset.doc;
  if (!confirm("Delete permanently?")) return;
  try {
    await axios.delete(doc, { headers: headers() });
    alert("Deleted");
    loadProducts();
  } catch (err) { console.error(err); alert("Delete failed"); }
}

// reports
document.getElementById("report-inventory").addEventListener("click", async () => {
  try {
    const res = await axios.get(fsURL(COLLECTION_PRODUCTS), { headers: headers() });
    const docs = res.data.documents || [];
    const products = docs.map(d => fromFields(d.fields));
    const low = products.filter(p => Number(p.qty||0) < 15);
    const high = products.filter(p => Number(p.qty||0) > 100);
    reportOutput.innerHTML = `<p>Total products: ${products.length}</p>
      <p>Low stock (<15): ${low.length}</p>
      <p>High stock (>100): ${high.length}</p>
      <h4>Low stock items</h4><ul>${low.map(x=>`<li>${x.name} - ${x.qty}</li>`).join("")}</ul>`;
  } catch (err) { console.error(err); alert("Failed to run report"); }
});

document.getElementById("report-sales").addEventListener("click", async () => {
  try {
    const res = await axios.get(fsURL(COLLECTION_ORDERS), { headers: headers() });
    const docs = res.data.documents || [];
    const orders = docs.map(d => fromFields(d.fields));
    const totalSales = orders.reduce((s,o) => s + Number(o.total||0), 0);
    reportOutput.innerHTML = `<p>Total orders: ${orders.length} • Total sales: ₹${totalSales}</p>`;
  } catch (err) { console.error(err); alert("Failed to run sales report"); }
});

loadProducts();
