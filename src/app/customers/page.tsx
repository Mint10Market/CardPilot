import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { CustomersList } from "./CustomersList";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Customers">
      <CustomersList />
    </AppShell>
  );
}
