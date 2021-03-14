import firebase from "firebase";

// Because of some fun with quotas, I now have two possible test firestore targets, whee.
/*
var firebaseConfig = {
  apiKey: "AIzaSyBhRqqU7RuMT72eFPP-VuswjMCA0uObj-s",
  authDomain: "ranlab-test.firebaseapp.com",
  projectId: "ranlab-test",
  storageBucket: "ranlab-test.appspot.com",
  messagingSenderId: "861002956013",
  appId: "1:861002956013:web:3d9236b7e1e8a276bd20e4",
  measurementId: "G-JPX391FT8E"
};*/
var firebaseConfig = {
  apiKey: "AIzaSyAyaNrOrfio5hL3DfNuexMQOpdefys7PSA",
  authDomain: "temp-test-b8f04.firebaseapp.com",
  projectId: "temp-test-b8f04",
  storageBucket: "temp-test-b8f04.appspot.com",
  messagingSenderId: "829656614445",
  appId: "1:829656614445:web:bcb7083f650653310f1aa4",
  measurementId: "G-180MVEJXN2"
};

export const testApp = firebase.initializeApp(firebaseConfig);
export const testFirestore = testApp.firestore();
