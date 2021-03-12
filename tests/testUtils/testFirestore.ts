import firebase from "firebase";

var firebaseConfig = {
  apiKey: "AIzaSyBhRqqU7RuMT72eFPP-VuswjMCA0uObj-s",
  authDomain: "ranlab-test.firebaseapp.com",
  projectId: "ranlab-test",
  storageBucket: "ranlab-test.appspot.com",
  messagingSenderId: "861002956013",
  appId: "1:861002956013:web:3d9236b7e1e8a276bd20e4",
  measurementId: "G-JPX391FT8E"
};
export const testApp = firebase.initializeApp(firebaseConfig);
export const testFirestore = testApp.firestore();
