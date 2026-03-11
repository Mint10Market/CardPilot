import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getCustomerWithOrders } from "@/lib/customers";
import Link from "next/link";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const customer = await getCustomerWithOrders(id, user.id);
  if (!customer) notFound();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-sm)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-[var(--foreground)]">
            Card Pilot
          </Link>
          <Link href="/customers" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:underline">
            ← Customers
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            {customer.displayName || customer.identifier}
          </h1>
          <p className="text-[var(--muted)] mt-1">
            {customer.identifier} · {customer.source}
          </p>
          {customer.email && (
            <p className="text-[var(--muted)] mt-1">Email: {customer.email}</p>
          )}
          {customer.notes && (
            <p className="text-[var(--muted)] mt-2">{customer.notes}</p>
          )}
        </div>
        <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">Orders</h2>
        <div className="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden bg-[var(--card)] shadow-[var(--shadow-sm)]">
          {customer.orders.length === 0 ? (
            <p className="p-4 text-[var(--muted)]">No orders linked yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
                  <th className="p-3 font-medium text-[var(--foreground)]">Date</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Order ID</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Amount</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border)]">
                    <td className="p-3">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-[var(--muted)]">
                      {o.ebayOrderId ?? o.id}
                    </td>
                    <td className="p-3">${o.totalAmount}</td>
                    <td className="p-3 capitalize">{o.status?.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
