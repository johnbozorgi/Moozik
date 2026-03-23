<div align="center">
<h1>🎵 Moozik </h1>
<p><b>The Smart Digital AUX Cable for Parties and Road Trips</b></p>
</div>

📌 About Moozik

Moozik is a real-time collaborative media queue platform. It transforms listening to music in a group from a chaotic experience into a seamless, democratic, and fun activity.

One user (the Host) creates a Room and connects their device to the speakers. Other users (Guests) join via a simple link (no app installation required), search for their favorite YouTube tracks, and add them to the shared queue. The audio plays only from the Host's device to prevent echo and synchronization issues in physical spaces.

🛠 Tech Stack

This project is divided into three main environments and a backend API:

Backend API: Node.js, Express

Real-time Engine: Firebase Realtime Database

Persistent Storage: PostgreSQL

Host App (Mobile): Flutter (iOS & Android) - Handles background audio

Guest App (Web PWA): React.js - Frictionless entry

Admin Panel: React.js

🚀 Getting Started (Local Development)

Prerequisites

Make sure you have the following installed on your machine:

Node.js (v18 or higher)

Flutter SDK (for the Host App)

PostgreSQL database running locally or remotely

1. Clone the repository

git clone [https://github.com/johnbozorgi/Moozik.git](https://github.com/johnbozorgi/Moozik.git)
cd Moozik


2. Backend Setup (Node.js API)

Navigate to the backend directory, install dependencies, and configure your environment.

cd backend
npm install


Create a .env file in the backend root directory based on .env.example:

PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/moozik_db
YOUTUBE_API_KEY=your_youtube_data_api_key_here
FIREBASE_SERVICE_ACCOUNT=path/to/firebase-adminsdk.json


Run the backend server:

npm run dev


3. Guest App Setup (React PWA)

Navigate to the guest-web directory.

cd ../guest-web
npm install


Create a .env file in the guest-web root directory:

REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_FIREBASE_API_KEY=your_firebase_client_key
REACT_APP_FIREBASE_PROJECT_ID=your_project_id


Start the React development server:

npm start


4. Host App Setup (Flutter)

Navigate to the host-app directory.

cd ../host-app
flutter pub get


Ensure your emulator is running or a physical device is connected, then run:

flutter run


🧠 Core Mechanics & Caveats for Developers

If you are contributing to this project, please pay attention to the following architectural decisions:

LIFO Wildcard Execution: Guests have a "Wildcard" to skip the line. To prevent race conditions if two guests use it simultaneously, we use sort_order logic with Firebase Transactions instead of standard arrays.

YouTube Quota Limits: The backend caches YouTube search results (e.g., using memory or Redis) to minimize API quota consumption.

Background Audio (Host): The Flutter app must use background execution packages (like audio_service) to ensure the music does not stop when the Host's screen turns off.

State Recovery: If the Host's connection drops briefly, the app syncs the current timestamp with Firebase upon reconnection and performs a "Catch-up" seek.

📄 License

This project is licensed under the MIT License.
