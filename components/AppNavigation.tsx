"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import styles from "./AppNavigation.module.css";

function isLimitedPath(pathname:string){
 if(pathname==="/connexion"||pathname.startsWith("/connexion/"))return true;
 if(pathname==="/start"||pathname.startsWith("/start/"))return true;
 if(pathname==="/auth"||pathname.startsWith("/auth/"))return true;
 if(pathname==="/inscription"||pathname==="/inscription/style")return true;
 return false;
}

export default function AppNavigation(){
 const pathname=usePathname();
 const router=useRouter();
 if(!pathname||pathname==="/")return null;

 const limited=isLimitedPath(pathname);
 const goBack=()=>{
  if(typeof window!=="undefined"&&window.history.length>1)router.back();
  else router.push("/");
 };

 return <nav className={styles.dock} aria-label="Navigation rapide Look&Go">
  <button type="button" onClick={goBack} className={styles.item} aria-label="Revenir à la page précédente">
   <span aria-hidden="true">←</span><b>Retour</b>
  </button>
  <Link href="/" className={styles.item} aria-label="Revenir à l’accueil Look&Go">
   <span aria-hidden="true">⌂</span><b>Accueil</b>
  </Link>
  {!limited&&<Link href="/profil" className={`${styles.item} ${pathname==="/profil"?styles.active:""}`} aria-label="Ouvrir mon profil Look&Go">
   <span aria-hidden="true">♙</span><b>Profil</b>
  </Link>}
  {!limited&&<Link href="/mariage" className={`${styles.item} ${pathname==="/mariage"?styles.active:""}`} aria-label="Ouvrir mon Pack Mariage">
   <span aria-hidden="true">♡</span><b>Mariage</b>
  </Link>}
 </nav>;
}
