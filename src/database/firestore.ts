import firebase from "firebase";

let firebaseConfig = {
  apiKey: "AIzaSyA6GO5fwNJrBklVKvYQ9LJSIkznxB6oy4M",
  authDomain: "ranlab-mvp.firebaseapp.com",
  databaseURL: "https://ranlab-mvp.firebaseio.com",
  projectId: "ranlab-mvp",
  storageBucket: "ranlab-mvp.appspot.com",
  messagingSenderId: "234026995986",
  appId: "1:234026995986:web:ed82d23d535394775563cb"
};

export const app = firebase.initializeApp(firebaseConfig);
export const firestore = app.firestore();
