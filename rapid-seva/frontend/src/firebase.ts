import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBx7wjd8vWQz3SF4DcjoNarb5UaB3uhnKk",
  authDomain: "rapid-seva-6b9cc.firebaseapp.com",
  projectId: "rapid-seva-6b9cc",
  storageBucket: "rapid-seva-6b9cc.firebasestorage.app",
  messagingSenderId: "423342822581",
  appId: "1:423342822581:web:b337ded3272e62facddafc",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
