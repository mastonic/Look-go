const DB_NAME="lookgo_beta_media_v2";
const LEGACY_DB_NAME="lookgo_beta_media_v1";
const STORE="media";
const DB_VERSION=1;
const CACHE_NAME="lookgo_beta_media_cache_v1";
export type BetaMediaKey="portrait"|"fullBody"|"tryonSignature"|"tryonBalance"|"tryonSmart"|"videoSignature"|"videoBalance"|"videoSmart"|"weddingTryonSignature"|"weddingTryonBalance"|"weddingTryonSmart"|"weddingVideoSignature"|"weddingVideoBalance"|"weddingVideoSmart";

function ensureIndexedDb(){if(typeof window==="undefined"||!("indexedDB" in window))throw new Error("IndexedDB indisponible")}
function openNamedDb(name:string):Promise<IDBDatabase>{ensureIndexedDb();return new Promise((resolve,reject)=>{const req=indexedDB.open(name,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Ouverture IndexedDB impossible"));req.onblocked=()=>reject(new Error("IndexedDB bloquée"))})}
function openDb(){return openNamedDb(DB_NAME)}
function cacheRequest(key:BetaMediaKey){return new Request(`/__lookgo_beta_media__/${key}`,{method:"GET"})}

async function saveCache(key:BetaMediaKey,file:Blob){if(typeof caches==="undefined")throw new Error("Cache Storage indisponible");const cache=await caches.open(CACHE_NAME);await cache.put(cacheRequest(key),new Response(file,{headers:{"content-type":file.type||"application/octet-stream"}}))}
async function readCache(key:BetaMediaKey){if(typeof caches==="undefined")return null;try{const cache=await caches.open(CACHE_NAME);const response=await cache.match(cacheRequest(key));return response?await response.blob():null}catch{return null}}
async function deleteCache(key:BetaMediaKey){if(typeof caches==="undefined")return;try{const cache=await caches.open(CACHE_NAME);await cache.delete(cacheRequest(key))}catch{}}

async function writeIndexed(key:BetaMediaKey,file:Blob){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(file,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("Écriture impossible"));tx.onabort=()=>reject(tx.error||new Error("Écriture annulée"))})}finally{db.close()}}
async function readIndexed(name:string,key:BetaMediaKey):Promise<Blob|null>{const db=await openNamedDb(name);try{return await new Promise<Blob|null>((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve((req.result as Blob)||null);req.onerror=()=>reject(req.error)})}finally{db.close()}}

export async function persistBetaStorage(){if(typeof navigator!=="undefined"&&navigator.storage?.persist){try{await navigator.storage.persist()}catch{}}}

export async function saveBetaMedia(key:BetaMediaKey,file:Blob){await persistBetaStorage();let indexed=false;try{await writeIndexed(key,file);indexed=true}catch{}let cached=false;try{await saveCache(key,file);cached=true}catch{}if(!indexed&&!cached)throw new Error("Impossible de conserver le média sur cet appareil")}

export async function readBetaMedia(key:BetaMediaKey):Promise<Blob|null>{
 let current:Blob|null=null;try{current=await readIndexed(DB_NAME,key)}catch{}if(current)return current;
 let legacy:Blob|null=null;try{legacy=await readIndexed(LEGACY_DB_NAME,key)}catch{}if(legacy){try{await saveBetaMedia(key,legacy)}catch{}return legacy}
 return await readCache(key);
}

export async function hasBetaMedia(key:BetaMediaKey){try{return Boolean(await readBetaMedia(key))}catch{return false}}

export async function deleteBetaMedia(key:BetaMediaKey){try{const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}}catch{}await deleteCache(key)}

export async function clearBetaMedia(){for(const key of ["portrait","fullBody","tryonSignature","tryonBalance","tryonSmart","videoSignature","videoBalance","videoSmart","weddingTryonSignature","weddingTryonBalance","weddingTryonSmart","weddingVideoSignature","weddingVideoBalance","weddingVideoSmart"] as BetaMediaKey[])await deleteBetaMedia(key)}
