import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getCustomerWithOrders } from "@/lib/customers";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CustomerProfileEdit } from "./CustomerProfileEdit";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

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

  const stats = customer.stats;
  const location = customer.location;

  type Row = { date: string; type: "eBay" | "Manual"; id: string; idLabel: string; amount: string; status: string | null };
  const ebayRows: Row[] = customer.orders.map((o) => ({
    date: (o.orderDate instanceof Date ? o.orderDate : new Date(o.orderDate)).toISOString(),
    type: "eBay" as const,
    id: o.id,
    idLabel: o.ebayOrderId ?? o.id,
    amount: String(o.totalAmount),
    status: o.status ?? null,
  }));
  const manualRows: Row[] = customer.manualSales.map((m) => ({
    date: (m.saleDate instanceof Date ? m.saleDate : new Date(m.saleDate)).toISOString(),
    type: "Manual" as const,
    id: m.id,
    idLabel: "Manual sale",
    amount: String(m.amount),
    status: null,
  }));
  const combinedRows = [...ebayRows, ...manualRows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const locationLine =
    location &&
    [location.city, location.stateOrProvince, location.countryCode].filter(Boolean).join(", ");

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
        <CustomerProfileEdit
          customerId={customer.id}
          displayName={customer.displayName}
          identifier={customer.identifier}
          source={customer.source}
          email={customer.email}
          notes={customer.notes}
        />

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Total orders</p>
            <p className="text-xl font-semibold text-[var(--foreground)] mt-1">{stats.orderCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Total revenue</p>
            <p className="text-xl font-semibold text-[var(--foreground)] mt-1">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">First order</p>
            <p className="text-lg font-medium text-[var(--foreground)] mt-1">
              {formatDate(stats.firstOrderDate)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Last order</p>
            <p className="text-lg font-medium text-[var(--foreground)] mt-1">
              {formatDate(stats.lastOrderDate)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Avg. order value</p>
            <p className="text-xl font-semibold text-[var(--foreground)] mt-1">
              {stats.orderCount > 0 ? formatCurrency(stats.averageOrderValue) : "—"}
            </p>
          </Card>
        </section>

        {locationLine ? (
          <div className="mb-6 text-[var(--muted)] text-sm">
            <span className="font-medium text-[var(--foreground)]">Location: </span>
            {locationLine}
          </div>
        ) : null}

        <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">Orders & sales</h2>
        <div className="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden bg-[var(--card)] shadow-[var(--shadow-sm)]">
          {combinedRows.length === 0 ? (
            <p className="p-4 text-[var(--muted)]">No orders or sales yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
                  <th className="p-3 font-medium text-[var(--foreground)]">Date</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Type</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Id</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Amount</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Status</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {combinedRows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="border-b border-[var(--border)]">
                    <td className="p-3">{formatDate(row.date)}</td>
                    <td className="p-3 capitalize">{row.type.toLowerCase()}</td>
                    <td className="p-3 font-mono text-[var(--muted)]">{row.idLabel}</td>
                    <td className="p-3">{formatCurrency(parseFloat(row.amount) || 0)}</td>
                    <td className="p-3 capitalize">{row.status?.toLowerCase() ?? "—"}</td>
                    <td className="p-3">
                      {row.type === "eBay" ? (
                        <Link
                          href="/sales"
                          className="text-[var(--accent)] hover:underline"
                        >
                          View in Sales
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
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
