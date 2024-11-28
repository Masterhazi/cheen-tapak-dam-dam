// Your web app's Firebase configuration

// Fetch configuration from the backend
fetch('/api/config')
    .then(response => response.json())
    .then(config => {
        // Use the config values as needed
        const fcmServerKey = config.FCM_SERVER_KEY;
        const firebaseApiKey = config.FIREBASE_API_KEY;
        const firebaseAuthDomain = config.FIREBASE_AUTH_DOMAIN;
        const firebaseProjectId = config.FIREBASE_PROJECT_ID;
        const firebaseStorageBucket = config.FIREBASE_STORAGE_BUCKET;
        const firebaseMessagingSenderId = config.FIREBASE_MESSAGING_SENDER_ID;
        const firebaseAppId = config.FIREBASE_APP_ID;

        // Initialize Firebase with these values
        const firebaseConfig = {
            apiKey: firebaseApiKey,
            authDomain: firebaseAuthDomain,
            projectId: firebaseProjectId,
            storageBucket: firebaseStorageBucket,
            messagingSenderId: firebaseMessagingSenderId,
            appId: firebaseAppId
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
    })
    .catch(error => {
        console.error('Error fetching configuration:', error);
    });
    
// Initialize Firestore
const db = firebase.firestore();

// Get references to the UI elements
const registerButton = document.getElementById('registerButton');
const loginButton = document.getElementById('loginButton');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const userDataContainer = document.getElementById('userDataContainer');
const userNameDisplay = document.getElementById('userName');
const userEmailDisplay = document.getElementById('userEmail');

// Show Login Form
loginButton.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Show Register Form
registerButton.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

// Register new user
document.getElementById('registerSubmitButton').addEventListener('click', () => {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User registered successfully
            console.log("User registered:", userCredential.user);
            alert("Registration successful!");

            // Save user data to Firestore
            const uid = userCredential.user.uid; // Get the user's UID
            return db.collection('users').doc(uid).set({
                name: name,
                email: email,
                // Add other fields as necessary
            });
        })
        .then(() => {
            console.log("User data saved to Firestore.");
            // Optionally update the UI or redirect after saving user data
        })
        .catch((error) => {
            console.error("Error registering:", error);
            alert(error.message);
        });
});

// Login with email and password
document.getElementById('loginSubmitButton').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User logged in successfully
            console.log("User logged in:", userCredential.user);
            fetchUserData(userCredential.user.uid); // Fetch user data after logging in
        })
        .catch((error) => {
            console.error("Error logging in:", error);
            alert(error.message);
        });
});

// Login with Google
document.getElementById('googleLoginButton').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            // User logged in with Google
            console.log("User logged in with Google:", result.user);
            fetchUserData(result.user.uid); // Fetch user data after logging in
        })
        .catch((error) => {
            console.error("Error logging in with Google:", error);
            alert(error.message);
        });
});

// Fetch user data from the database
function fetchUserData(uid) {
    const dbRef = db.collection('users').doc(uid);
    
    dbRef.get().then((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            userNameDisplay.textContent = `Name: ${userData.name}`;
            userEmailDisplay.textContent = `Email: ${userData.email}`;
            
            // Show user data container and hide auth forms
            userDataContainer.style.display = 'block';
            loginForm.classList.add('hidden');
            registerForm.classList.add('hidden');
        } else {
            console.log("No such document!");
        }
    }).catch((error) => {
        console.error("Error fetching user data:", error);
    });
}

// Set medication reminders (remains unchanged)
document.getElementById('medicationCount').addEventListener('input', function() {
    const count = parseInt(this.value);
    const timeInputsDiv = document.getElementById('timeInputs');
    timeInputsDiv.innerHTML = ''; // Clear previous inputs

    for (let i = 0; i < count; i++) {
        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.className = 'time-input';
        timeInput.placeholder = `Time for medication ${i + 1}`;
        timeInputsDiv.appendChild(timeInput);
    }
});

document.getElementById('setReminderButton').addEventListener('click', () => {
    const uid = firebase.auth().currentUser.uid; // Get current user's UID
    const times = Array.from(document.querySelectorAll('.time-input')).map(input => input.value);

    // Send the times to the backend to schedule notifications
    fetch('/set-reminder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uid: uid,
            times: times,
        })
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error setting reminders:', error));
});

// Logout functionality (remains unchanged)
logoutButton.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        console.log("User signed out.");
        userDataContainer.style.display = 'none';
        
        // Reset forms visibility
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');

         // Optionally show buttons or a message indicating sign-in is needed.
         document.querySelector('.button-container').style.display = 'block';
     }).catch((error) => {
         console.error("Error signing out:", error);
     });
});

// Monitor authentication state (remains unchanged)
firebase.auth().onAuthStateChanged((user) => {
     if (user) {
         // User is signed in, fetch their data
         fetchUserData(user.uid);
     } else {
         // User is signed out, show auth forms
         userDataContainer.style.display = 'none';
         
         // Reset forms visibility to show buttons for Login/Register
         loginForm.classList.add('hidden');
         registerForm.classList.add('hidden');

         // Optionally show buttons or a message indicating sign-in is needed.
         document.querySelector('.button-container').style.display = 'block';
     }
});