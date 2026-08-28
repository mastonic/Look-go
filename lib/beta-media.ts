const DB_NAME="lookgo_beta_media_v1";
const STORE="media";
const DB_VERSION=1;
export type BetaMediaKey="portrait"|"fullBody";

function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
}

export async function saveBetaMedia(key:BetaMediaKey,file:File){
 const db=await openDb();
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(file,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
 db.close();
}

export async function readBetaMedia(key:BetaMediaKey):Promise<Blob|null>{
 const db=await openDb();
 const value=await new Promise<Blob|null>((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve((req.result as Blob)||null);req.onerror=()=>reject(req.error)});
 db.close(); return value;
}

export async function deleteBetaMedia(key:BetaMediaKey){
 const db=await openDb();
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
 db.close();
}
