"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export default function SmartBetaEntryLink({children,...props}:{children:ReactNode}&Omit<ComponentProps<typeof Link>,"href">){
  return <Link href="/start" {...props}>{children}</Link>;
}
