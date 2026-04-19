# 📝 Firebase To-Do Web App

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-orange.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

Welcome to the **Firebase To-Do Web App**! This is a modern, serverless task management application built with Vanilla Web Technologies and Firebase. It features real-time synchronization, sleek dark/light modes, customizable task categories, and an intelligent "History" archive system.

---

## ✨ Features

- **🔐 Secure Authentication:** Seamless sign-up and login securely handled via Firebase Authentication.
- **⚡ Real-time Sync:** Powered by Cloud Firestore `onSnapshot`. Tasks added on one device update instantly on all others.
- **🎨 Modern UI & Theming:** Sleek, responsive design with an integrated Light/Dark mode toggle.
- **📅 Advanced Task Management:** 
  - Set Priorities, Categories, and Due Dates.
  - Search and filter tasks by status seamlessly.
- **🕰️ Smart History System:** Tasks automatically transition to a "History" archive after a 5 AM cutoff, keeping your active view clutter-free.
- **🔒 Privacy First:** Strict Firestore security rules ensure that users can only ever access and view their own data.

## 🛠️ Technology Stack

- **Frontend:** HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+)
- **Backend/BaaS:** Firebase (Authentication, Cloud Firestore)

## 🚀 Quick Start & Setup Guide

### 1. Firebase Project Setup
1. Head over to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** (Email/Password method).
3. Create a **Firestore Database** (Start in Test Mode or Production Mode).

### 2. Configure the App
1. Register a new Web App in your Firebase project settings.
2. Clone this repository locally.
3. Open `app.js` (or your dedicated Firebase initialization snippet) and replace the configuration block:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

### 3. Firestore Security Rules
Protect user data by applying these rules in your Firestore **Rules** tab:
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/tasks/{taskId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Run the App
To prevent CORS or module loading issues, **serve the app locally over HTTP**.

Using Python:
```bash
python -m http.server 5500
```
Then visit `http://localhost:5500` in your browser. (Alternatively, use VS Code Live Server).

---

## 🤝 Contributing

We welcome contributions from the community! If you're reading this on GitHub and want to add features or fix bugs:

1. **Fork** the repository.
2. **Create a new branch** (`git checkout -b feature/amazing-feature`).
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`).
4. **Push to the branch** (`git push origin feature/amazing-feature`).
5. Open a **Pull Request**.

Please ensure your code follows the existing vanilla JavaScript style and that any new UI components maintain the responsive design and theming structure.

## 📝 License

This project is open-source and available under the MIT License.
