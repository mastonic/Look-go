"use client";

const OFFICIAL_LOGO_PATH="/lookgo-logo.svg";

type DecodedImage={source:CanvasImageSource;width:number;height:number;close:()=>void};

async function decode(blob:Blob):Promise<DecodedImage>{
 if(typeof createImageBitmap==="function"){
  const bitmap=await createImageBitmap(blob);
  return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};
 }
 const url=URL.createObjectURL(blob);
 const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Image illisible"));img.src=url;});
 return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>URL.revokeObjectURL(url)};
}

function cornerActivity(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
 try{
  const data=ctx.getImageData(Math.max(0,Math.floor(x)),Math.max(0,Math.floor(y)),Math.max(1,Math.min(ctx.canvas.width-Math.floor(x),Math.floor(w))),Math.max(1,Math.min(ctx.canvas.height-Math.floor(y),Math.floor(h)))).data;
  let score=0,samples=0,previous=-1;
  for(let i=0;i<data.length;i+=32){const luma=(data[i]*.2126)+(data[i+1]*.7152)+(data[i+2]*.0722);if(previous>=0)score+=Math.abs(luma-previous);previous=luma;samples++;}
  return samples?score/samples:0;
 }catch{return 0}
}

function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}

export async function applyLookGoWatermark(input:Blob):Promise<Blob>{
 const [image,logoResponse]=await Promise.all([decode(input),fetch(OFFICIAL_LOGO_PATH,{cache:"force-cache"})]);
 if(!logoResponse.ok){image.close();throw new Error("Logo Look&Go indisponible");}
 const logo=await decode(await logoResponse.blob());
 try{
  const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas indisponible");ctx.drawImage(image.source,0,0,image.width,image.height);
  const margin=Math.max(18,Math.round(Math.min(image.width,image.height)*.025));
  const targetWidth=Math.min(Math.max(150,image.width*.21),Math.min(360,image.width*.3));
  const targetHeight=targetWidth*(logo.height/logo.width);
  const pad=Math.max(8,targetWidth*.035);const plateW=targetWidth+(pad*2);const plateH=targetHeight+(pad*2);
  const rightX=image.width-margin-plateW;const leftX=margin;const y=image.height-margin-plateH;
  const rightActivity=cornerActivity(ctx,rightX,y,plateW,plateH);const leftActivity=cornerActivity(ctx,leftX,y,plateW,plateH);
  const x=rightActivity>leftActivity*1.45?leftX:rightX;
  ctx.save();ctx.shadowColor="rgba(0,0,0,.22)";ctx.shadowBlur=Math.max(8,targetWidth*.045);ctx.shadowOffsetY=Math.max(2,targetWidth*.01);ctx.fillStyle="rgba(255,255,255,.78)";roundedRect(ctx,x,y,plateW,plateH,Math.max(10,targetWidth*.035));ctx.fill();ctx.restore();
  ctx.globalAlpha=.94;ctx.drawImage(logo.source,x+pad,y+pad,targetWidth,targetHeight);ctx.globalAlpha=1;
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Export image impossible")),"image/png"));
 }finally{image.close();logo.close();}
}
