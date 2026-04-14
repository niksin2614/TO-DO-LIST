# Firebase To-Do Web App Setup Guide

This project is a complete serverless to-do app built with:

- HTML, CSS, and JavaScript
- Firebase Authentication with email/password
- Cloud Firestore with real-time updates

## Files included

- `index.html`
- `style.css`
- `app.js`

## Step 1: Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project**.
3. Enter a project name.
4. Continue through the setup steps and create the project.

## Step 2: Register a web app

1. In your Firebase project, click the **Web** icon to add an app.
2. Give the app a name.
3. Firebase will show your app configuration.
4. Open `app.js`.
5. Find the `Firebase config section`.
6. Replace the placeholder values with your real Firebase config.

Example:

```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "your-app-id",
};
```

## Step 3: Enable email/password authentication

1. In Firebase Console, open **Authentication**.
2. Click **Get started**.
3. Open the **Sign-in method** tab.
4. Enable **Email/Password**.
5. Save your changes.

## Step 4: Create the Firestore database

1. Open **Firestore Database**.
2. Click **Create database**.
3. Start in **Production mode** or **Test mode**.
4. Choose your Firebase region.
5. Create the database.

## Step 5: Add Firestore security rules

This app stores each user's tasks under:

`users/{uid}/tasks/{taskId}`

Use these Firestore rules so users can only access their own tasks:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/tasks/{taskId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

To add them:

1. Open **Firestore Database** in Firebase.
2. Go to the **Rules** tab.
3. Replace the existing rules with the rules above.
4. Click **Publish**.

Task documents now include these fields:

- `text`
- `completed`
- `priority`
- `category`
- `dueDate`
- `createdAt`

Older tasks without the new fields will still render, and the app will fall back to default values when needed.

## Step 6: Authorized domains

If you run the app locally, `localhost` is usually already allowed by Firebase Authentication.

If needed:

1. Open **Authentication**.
2. Go to **Settings**.
3. Add your local domain if it is not already listed.

## Step 7: Run the app locally

Do not open the app directly with `file://`. Serve it over HTTP instead.

Examples:

```bash
python -m http.server 5500
```

Then open:

`http://localhost:5500`

You can also use VS Code Live Server or Firebase Hosting.

## Step 8: How the app works

- Users can sign up with email and password.
- Existing users can log in.
- Logged-in users can add tasks.
- Users only see their own tasks because data is stored under `users/{uid}/tasks`.
- Tasks update in real time with Firestore `onSnapshot`.
- Users can edit task text.
- Users can set task priority, category, and due date.
- Users can search tasks by name and filter by status.
- Users can switch between light and dark mode.
- Users can mark tasks as completed.
- Users can delete tasks.
- Users can log out.

## Notes

- If you see Firebase errors, double-check the config values in `app.js`.
- Make sure Authentication and Firestore are both enabled in Firebase.
- If tasks fail to load or save, verify your Firestore rules.
