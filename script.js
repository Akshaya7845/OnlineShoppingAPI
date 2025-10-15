const PROJECT_ID = "online-shopping-5a1d9";
const FIREBASE_API_KEY = "AIzaSyAXIr4U4eKq57_l2XMg8xWOfB17SY6hhvQ";
const ADMIN_EMAIL = "akshayamurugan0406@gmail.com";

function setSession(data) {
  sessionStorage.setItem("firebase_id_token", data.idToken);
  sessionStorage.setItem("user_email", data.email || "");
  sessionStorage.setItem("user_name", data.displayName || "");
  sessionStorage.setItem("user_pic", data.photoUrl || "");
}

function getIdToken() {
  return sessionStorage.getItem("firebase_id_token");
}
function getUserEmail() {
  return sessionStorage.getItem("user_email");
}
function firestoreURL(collectionPath) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collectionPath)}`;
}
function authHeaders() {
  const t = getIdToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function toFields(obj) {
  const fields = {};
  for (const k in obj) {
    const v = obj[k];
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (Number.isInteger(v)) fields[k] = { integerValue: String(v) };
    else if (typeof v === "number") fields[k] = { doubleValue: v };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (v instanceof Array) fields[k] = { arrayValue: { values: v.map(x => ({ stringValue: String(x) })) } };
    else fields[k] = { stringValue: JSON.stringify(v) };
  }
  return fields;
}
function fromFields(fields) {
  const out = {};
  for (const k in fields) {
    const val = fields[k];
    if (val.stringValue !== undefined) out[k] = val.stringValue;
    else if (val.integerValue !== undefined) out[k] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) out[k] = val.doubleValue;
    else if (val.booleanValue !== undefined) out[k] = val.booleanValue;
    else if (val.arrayValue !== undefined) out[k] = (val.arrayValue.values||[]).map(v => v.stringValue);
    else out[k] = val;
  }
  return out;
}

async function onGoogleCredential(response) {
 
  try {
    const googleIdToken = response.credential;
   
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: window.location.origin,
        returnSecureToken: true
      })
    });
    const data = await res.json();
    if (!data.idToken) {
      alert("Failed to sign in. Check console.");
      console.error(data);
      return;
    }

    setSession({ idToken: data.idToken, email: data.email, displayName: data.displayName, photoUrl: data.photoUrl });

    showRoleModal();
  } catch (err) {
    console.error("Login error", err);
    alert("Login failed (see console).");
  }
}

const roleModal = document.getElementById("role-modal");
document.getElementById("role-admin").addEventListener("click", async () => {
  roleModal.style.display = "none";
  const email = getUserEmail();
  if (!email) { alert("No email in session"); return; }
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    alert("Not authorized as admin.");
    return;
  }

  window.location.href = "admin.html";
});
document.getElementById("role-user").addEventListener("click", async () => {
  roleModal.style.display = "none";

  const email = getUserEmail();
  if (!email) { alert("No email in session"); return; }
  const docId = email.replace(/[@.]/g,"_");
  try {
    const res = await axios.get(`${firestoreURL("Users")}/${encodeURIComponent(docId)}`, { headers: authHeaders() });

    window.location.href = "products.html";
  } catch (err) {
  
    showSignupModal();
  }
});
document.getElementById("role-cancel").addEventListener("click", () => { roleModal.style.display = "none"; });


function showRoleModal() {
  roleModal.style.display = "flex";
}
function showSignupModal() {
  document.getElementById("signup-modal").style.display = "flex";

  document.getElementById("su-name").value = sessionStorage.getItem("user_name") || "";

  const form = document.getElementById("signup-form");
  function onSubmit(e) {
    e.preventDefault();
    createUserRecord().then(() => {
      document.getElementById("signup-modal").style.display = "none";
      window.location.href = "products.html";
    }).catch(err => {
      console.error(err);
      alert("Signup failed. See console.");
    });
    form.removeEventListener("submit", onSubmit);
  }
  form.addEventListener("submit", onSubmit);
  document.getElementById("su-cancel").addEventListener("click", () => {
    document.getElementById("signup-modal").style.display = "none";
  }, { once: true });
}

async function createUserRecord() {
  const name = document.getElementById("su-name").value.trim();
  const phone = document.getElementById("su-phone").value.trim();
  const address = document.getElementById("su-address").value.trim();
  const email = getUserEmail();
  const docId = email.replace(/[@.]/g,"_");
  const payload = { fields: toFields({ email, name, phone, address, creditLimit: 1000, usedCredit: 0 }) };
  const url = `${firestoreURL("Users")}?documentId=${encodeURIComponent(docId)}`;
  await axios.post(url, payload, { headers: authHeaders() });
  return;
}

window.addEventListener("load", () => {
  const email = getUserEmail();
  if (email) {
 
    const card = document.getElementById("login-card");
    const p = document.createElement("p");
    p.className = "muted";
    p.innerText = `Signed in as ${email}. Choose role or go to Products/Admin.`;
    card.appendChild(p);
  }
});

// open cart
document.getElementById("view-cart").addEventListener("click", () => {
  document.getElementById("cart-modal").style.display = "flex";
});

// close cart
document.getElementById("cart-close").addEventListener("click", () => {
  document.getElementById("cart-modal").style.display = "none";
});

