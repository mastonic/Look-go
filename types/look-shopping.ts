export type LookProduct={
 id:string;
 category:string;
 name:string;
 brand?:string;
 price?:number;
 currency?:"EUR";
 imageUrl?:string;
 productUrl?:string;
 merchant?:string;
 matchType:"exact"|"similar";
 affiliate?:boolean;
 available?:boolean;
};

export type GeneratedLookShopping={
 tier:"signature"|"balance"|"smart";
 products:LookProduct[];
 total?:number;
};
