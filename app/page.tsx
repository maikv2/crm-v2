export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const clients = await prisma.client.count();
  const exhibitors = await prisma.exhibitor.count();
  const products = await prisma.product.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ordersToday = await prisma.order.count({
    where: {
      issuedAt: {
        gte: today,
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* MENU LATERAL */}
      <aside className="w-64 bg-black text-white p-6">
        <h1 className="text-2xl font-bold mb-8">V2 CRM</h1>

        <nav className="flex flex-col gap-4">
          <Link href="/dashboard" className="hover:text-gray-300">
            Dashboard
          </Link>

          <Link href="/clients" className="hover:text-gray-300">
            Clientes
          </Link>

          <Link href="/exhibitors" className="hover:text-gray-300">
            Expositores
          </Link>

          <Link href="/products" className="hover:text-gray-300">
            Produtos
          </Link>

          <Link href="/stock" className="hover:text-gray-300">
            Estoque
          </Link>

          <Link href="/orders" className="hover:text-gray-300">
            Pedidos
          </Link>

          <Link href="/finance" className="hover:text-gray-300">
            Financeiro
          </Link>

          <Link href="/finance/receivables" className="hover:text-gray-300">
            Contas a Receber
          </Link>

          <Link href="/finance/region-cash" className="hover:text-gray-300">
            Caixa da Região
          </Link>

          <Link href="/finance/transfers">
            Repasses Região → Matriz
          </Link>
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-10">
        <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Clientes</h3>
            <p className="text-2xl font-bold">{clients}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Expositores</h3>
            <p className="text-2xl font-bold">{exhibitors}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Produtos</h3>
            <p className="text-2xl font-bold">{products}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Pedidos Hoje</h3>
            <p className="text-2xl font-bold">{ordersToday}</p>
          </div>
        </div>
      </main>
    </div>
  );
}