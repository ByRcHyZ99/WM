import { getCurrentUser } from "@/lib/auth";
import { getAppData } from "@/lib/app-data";
import { TipspielApp } from "@/components/tippspiel-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const data = await getAppData(user?.id);

  return <TipspielApp initialUser={user} initialData={data} />;
}
