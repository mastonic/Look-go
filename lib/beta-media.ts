const DB_NAME="lookgo_beta_media_v2";
const STORE="media";
const DB_VERSION=1;
export type BetaMediaKey="portrait"|"fullBody"|"tryonSignature"|"tryonBalance"|"tryonSmart"|"videoSignature"|"videoBalance"|"videoSmart";

function ensureIndexedDb(){
 if(typeof window==="undefined"||!("indexedDB" in window)) throw new Error("IndexedDB indisponible");
}

function openDb():Promise<IDBDatabase>{
 ensureIndexedDb();
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error("Ouverture IndexedDB impossible"));
  req.onblocked=()=>reject(new Error("IndexedDB bloquée"));
 });
}

export async function persistBetaStorage(){
 if(typeof navigator!=="undefined"&&navigator.storage?.persist){try{await navigator.storage.persist()}catch{}}
}

export async function saveBetaMedia(key:BetaMediaKey,file:Blob){
 await persistBetaStorage();
 const db=await openDb();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE,"readwrite");
   tx.objectStore(STORE).put(file,key);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||new Error("Écriture impossible"));
   tx.onabort=()=>reject(tx.error||new Error("Écriture annulée"));
  });
 }finally{db.close()}
}

export async function readBetaMedia(key:BetaMediaKey):Promise<Blob|null>{
 const db=await openDb();
 try{return await new Promise<Blob|null>((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve((req.result as Blob)||null);req.onerror=()=>reject(req.error)})}finally{db.close()}
}

export async function hasBetaMedia(key:BetaMediaKey){try{return Boolean(await readBetaMedia(key))}catch{return false}}

export async function deleteBetaMedia(key:BetaMediaKey){
 const db=await openDb();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}
}
