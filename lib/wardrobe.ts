export type WardrobeCategory="haut"|"bas"|"robe"|"veste"|"chaussures"|"sac"|"accessoire"|"autre";
export type WardrobeStatus="pending"|"validated"|"rejected";

export type WardrobeItem={
 id:string;
 name:string;
 category:WardrobeCategory;
 subcategory?:string;
 primaryColor:string;
 secondaryColors?:string[];
 pattern?:string;
 material?:string;
 style?:string[];
 season?:string[];
 confidence:number;
 status:WardrobeStatus;
 scanId:string;
 createdAt:string;
};

const KEY="lookgo_wardrobe_v1";

function safeItems(value:unknown):WardrobeItem[]{
 if(!Array.isArray(value))return [];
 return value.filter(item=>item&&typeof item==="object"&&typeof (item as WardrobeItem).id==="string") as WardrobeItem[];
}

export function readWardrobe():WardrobeItem[]{
 if(typeof window==="undefined")return [];
 try{return safeItems(JSON.parse(localStorage.getItem(KEY)||"[]"))}catch{return []}
}

export function saveWardrobe(items:WardrobeItem[]){
 if(typeof window==="undefined")return;
 localStorage.setItem(KEY,JSON.stringify(items));
}

export function mergeWardrobe(items:WardrobeItem[]){
 const current=readWardrobe();
 const map=new Map(current.map(item=>[item.id,item]));
 for(const item of items)map.set(item.id,item);
 const merged=Array.from(map.values()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 saveWardrobe(merged);
 return merged;
}

export function wardrobeCategoryLabel(category:WardrobeCategory){
 const labels:Record<WardrobeCategory,string>={haut:"Hauts",bas:"Bas",robe:"Robes & combinaisons",veste:"Vestes & manteaux",chaussures:"Chaussures",sac:"Sacs",accessoire:"Accessoires",autre:"Autres"};
 return labels[category];
}
