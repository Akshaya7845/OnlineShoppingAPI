// auth.js - helper utilities for Firestore REST & Firebase Auth REST
const FIREBASE_API_KEY = "AIzaSyAXIr4U4eKq57_l2XMg8xWOfB17SY6hhvQ"; // replace if needed
const PROJECT_ID = "online-shopping-5a1d9"; // your project id

function getIdToken() {
  return sessionStorage.getItem("firebase_id_token");
}

function getAuthHeaders() {
  const idToken = getIdToken();
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

// Convert a plain JS object to Firestore "fields" format
function toFirestoreFields(obj) {
  const fields = {};
  for (const k in obj) {
    const val = obj[k];
    if (typeof val === "string") fields[k] = { stringValue: val };
    else if (typeof val === "number") fields[k] = { doubleValue: val };
    else if (typeof val === "boolean") fields[k] = { booleanValue: val };
    else if (val instanceof Array) fields[k] = { arrayValue: { values: val.map(v => ({ stringValue: String(v) })) } };
    else fields[k] = { stringValue: JSON.stringify(val) };
  }
  return fields;
}

// Convert Firestore document fields to plain object
function fromFirestoreFields(fields) {
  const out = {};
  for (const k in fields) {
    const valueObj = fields[k];
    if (valueObj.stringValue !== undefined) out[k] = valueObj.stringValue;
    else if (valueObj.doubleValue !== undefined) out[k] = valueObj.doubleValue;
    else if (valueObj.integerValue !== undefined) out[k] = parseInt(valueObj.integerValue, 10);
    else if (valueObj.booleanValue !== undefined) out[k] = valueObj.booleanValue;
    else if (valueObj.arrayValue !== undefined) out[k] = valueObj.arrayValue.values.map(v => v.stringValue);
    else out[k] = valueObj; // fallback
  }
  return out;
}

// Firestore collection base URL
function firestoreBaseURL(collectionName) {
  const enc = encodeURIComponent(collectionName);
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${enc}`;
}
