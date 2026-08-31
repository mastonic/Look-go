import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type LookGoFirebase={app:FirebaseApp;auth:Auth;db:Firestore;storage:FirebaseStorage};

function config(){
 const apiKey=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
 const authDomain=process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
 const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
 const storageBucket=process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
 const messagingSenderId=process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
 const appId=process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
 if(!apiKey||!authDomain||!projectId||!storageBucket||!appId) return null;
 return {apiKey,authDomain,projectId,storageBucket,messagingSenderId,appId};
}

export function firebaseReady(){return Boolean(config())}

export function getLookGoFirebase():LookGoFirebase|null{
 const cfg=config();
 if(!cfg) return null;
 const app=getApps().length?getApp():initializeApp(cfg);
 return {app,auth:getAuth(app),db:getFirestore(app),storage:getStorage(app)};
}
