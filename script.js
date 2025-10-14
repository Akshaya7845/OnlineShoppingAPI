async function handleCredentialResponse(response) {
  const googleIdToken = response.credential; // JWT from Google
  console.log("Google ID Token:", googleIdToken);
 
  // Exchange Google ID token for Firebase ID token via REST API
  const firebaseRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=
AIzaSyAXIr4U4eKq57_l2XMg8xWOfB17SY6hhvQ`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: window.location.origin,
        returnSecureToken: true,
      }),
    }
  );
 
  const firebaseData = await firebaseRes.json();
  console.log("Firebase Auth Data:", firebaseData);
 
  if (firebaseData.idToken) {
    // Display user info
    document.getElementById("user-info").style.display = "block";
    document.getElementById("user-name").innerText = firebaseData.displayName;
    document.getElementById("user-email").innerText = firebaseData.email;
    document.getElementById("user-pic").src = firebaseData.photoUrl;
 
    // Store Firebase ID token for backend requests
    localStorage.setItem("firebase_id_token", firebaseData.idToken);
  } else {
    alert("Login failed! Check console for details.");
    console.error(firebaseData);
  }
  // After storing the token
localStorage.setItem("firebase_id_token", firebaseData.idToken);

// Redirect to products page
window.location.href = "products.html";

}
