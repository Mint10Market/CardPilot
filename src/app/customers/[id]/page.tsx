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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-zinc-100">
            Card Pilot
          </Link>
          <Link href="/customers" className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline">
            ← Customers
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {customer.displayName || customer.identifier}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {customer.identifier} · {customer.source}
          </p>
          {customer.email && (
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">Email: {customer.email}</p>
          )}
          {customer.notes && (
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">{customer.notes}</p>
          )}
        </div>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">Orders</h2>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
          {customer.orders.length === 0 ? (
            <p className="p-4 text-zinc-500">No orders linked yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Order ID</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="p-3">
                      {new Date(o.orderDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">
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
