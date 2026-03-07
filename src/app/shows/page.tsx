import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { ShowsList } from "./ShowsList";

export default async function ShowsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Card Shows">
      <ShowsList />
    </AppShell>
  );
}
