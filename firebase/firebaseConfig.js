import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
    apiKey: "AIzaSyDDnOV2xK6ed-HEOe6eOKGhcmu410MEesA",
    authDomain: "chat-app-d2580.firebaseapp.com",
    projectId: "chat-app-d2580",
    storageBucket: "chat-app-d2580.firebasestorage.app",
    messagingSenderId: "28625780995",
    appId: "1:28625780995:web:7e7ee7a70ee0abbcd2a936",
    measurementId: "G-2SMNVFB1TR"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)