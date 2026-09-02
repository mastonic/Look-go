import {redirect} from "next/navigation";
import {auth} from "@/auth";
import {ADMIN_EMAIL} from "@/lib/ai/providers";
import AdminAiConsole from "./AdminAiConsole";
import "./admin-ai.css";

export default async function AdminAiPage(){
 const session=await auth();
 const email=String(session?.user?.email||"").trim().toLowerCase();
 if(email!==ADMIN_EMAIL)redirect("/connexion?returnTo=%2Fadmin%2Fai");
 return <AdminAiConsole/>;
}
