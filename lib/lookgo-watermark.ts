"use client";

const OFFICIAL_LOGO_PATH="/lookgo-logo.svg";

type DecodedImage={source:CanvasImageSource;width:number;height:number;close:()=>void};

async function decode(blob:Blob):Promise<DecodedImage>{
 if(typeof createImageBitmap==="function"){
  try{
   const bitmap=await createImageBitmap(blob);
   return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};
  }catch{
   // Some mobile browsers expose createImageBitmap but cannot decode SVG reliably.
  }
 }
 const url=URL.createObjectURL(blob);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Image illisible"));img.src=url;});
  return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>URL.revokeObjectURL(url)};
 }catch(error){URL.revokeObjectURL(url);throw error;}
}

export async function applyLookGoWatermark(input:Blob):Promise<Blob>{
 const [image,logoResponse]=await Promise.all([decode(input),fetch(OFFICIAL_LOGO_PATH,{cache:"force-cache"})]);
 if(!logoResponse.ok){image.close();throw new Error("Logo Look&Go indisponible");}
 const logo=await decode(await logoResponse.blob());
 try{
  const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas indisponible");

  // A slim premium matte is reserved inside the original canvas. The generated
  // image is scaled down slightly instead of being covered, so the brand mark
  // can never hide the face, garment, shoes or accessories.
  const footer=Math.max(48,Math.min(Math.round(canvas.height*.075),Math.round(canvas.width*.13)));
  const contentHeight=canvas.height-footer;
  const scale=Math.min(canvas.width/image.width,contentHeight/image.height);
  const drawWidth=Math.round(image.width*scale);const drawHeight=Math.round(image.height*scale);
  const drawX=Math.round((canvas.width-drawWidth)/2);const drawY=Math.round((contentHeight-drawHeight)/2);

  ctx.fillStyle="#f5f1e9";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image.source,drawX,drawY,drawWidth,drawHeight);
  ctx.fillStyle="rgba(17,17,17,.12)";ctx.fillRect(0,contentHeight,canvas.width,1);

  const margin=Math.max(12,Math.round(canvas.width*.025));
  const maxLogoHeight=Math.max(20,footer*.6);
  const maxLogoWidth=Math.min(canvas.width*.27,360);
  const ratio=logo.width/logo.height;
  const targetWidth=Math.min(maxLogoWidth,maxLogoHeight*ratio);
  const targetHeight=targetWidth/ratio;
  const x=canvas.width-margin-targetWidth;
  const y=contentHeight+(footer-targetHeight)/2;
  ctx.globalAlpha=.96;ctx.drawImage(logo.source,x,y,targetWidth,targetHeight);ctx.globalAlpha=1;

  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Export image impossible")),"image/png"));
 }finally{image.close();logo.close();}
}
