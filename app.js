/*const idToken = localStorage.getItem("firebase_id_token");
const projectId = "online-shopping-5a1d9";
const collectionName = "Products Shopping"; // Your collection name
const encodedCollection = encodeURIComponent(collectionName); // Handle space in name

const productList = document.getElementById("product-list");

if (!idToken) {
  alert("You must log in first.");
  window.location.href = "index.html";
}

// 🔥 Function to fetch specific collection
async function fetchCollectionData() {
  try {
    const res = await axios.get(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedCollection}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const documents = res.data.documents;

    if (!documents || documents.length === 0) {
      productList.innerHTML = "No products found in collection.";
      return;
    }

    productList.innerHTML = `<h2>${collectionName} Collection</h2>`;

    documents.forEach((doc) => {
      const div = document.createElement("div");
      div.className = "product";

      const fields = doc.fields;
      let content = "";

      // Loop through all fields in document and show them
      for (let key in fields) {
        const value = Object.values(fields[key])[0]; // Get the actual value
        content += `<p><strong>${key}:</strong> ${value}</p>`;
      }

      div.innerHTML = content + `<hr/>`;
      productList.appendChild(div);
    });

  } catch (error) {
    console.error("Error fetching collection data:", error);
    productList.innerHTML = "Error loading data. Check console.";
  }
}

fetchCollectionData();
*/
const idToken = localStorage.getItem("firebase_id_token");
const projectId = "online-shopping-5a1d9";
const collectionName = "Products Shopping";
const encodedCollection = encodeURIComponent(collectionName);

const productList = document.getElementById("product-list");
const searchBar = document.getElementById("search-bar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("page-info");

let allProducts = [];
let currentPage = 1;
const itemsPerPage = 6;

if (!idToken) {
  alert("You must log in first.");
  window.location.href = "index.html";
}

async function fetchProducts() {
  try {
    const res = await axios.get(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedCollection}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    const documents = res.data.documents || [];

    // Convert Firestore format to readable object
    allProducts = documents.map((doc) => {
      const fields = doc.fields;
      const product = {};

      for (let key in fields) {
        product[key] = Object.values(fields[key])[0];
      }

      return product;
    });

    renderProducts();
  } catch (err) {
    console.error("Error fetching data:", err);
    productList.innerHTML = "Failed to load products.";
  }
}

function renderProducts() {
  const filtered = filterProducts();
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);

  productList.innerHTML = "";

  paginated.forEach((product) => {
    const div = document.createElement("div");
    div.className = "product";

    div.innerHTML = `
      <img src="${product.imageURL || "https://via.placeholder.com/250x150"}" alt="${product.name}" />
      <h3>${product.name || "Unnamed"}</h3>
      <p><strong>Price:</strong> ₹${product.price || "N/A"}</p>
      <p><strong>Description:</strong> ${product.description || "-"}</p>
    `;

    productList.appendChild(div);
  });

  // Pagination Controls
  pageInfo.innerText = `Page ${currentPage} of ${totalPages || 1}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

function filterProducts() {
  const query = searchBar.value.toLowerCase();
  return allProducts.filter((p) =>
    p.name && p.name.toLowerCase().includes(query)
  );
}

// Events
searchBar.addEventListener("input", () => {
  currentPage = 1;
  renderProducts();
});

prevBtn.addEventListener("click", () => {
  currentPage--;
  renderProducts();
});

nextBtn.addEventListener("click", () => {
  currentPage++;
  renderProducts();
});

fetchProducts();
