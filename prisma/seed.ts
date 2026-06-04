import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("🌱 Seeding DiazTech database...\n");

  // 1. Create demo user
  const hashedPassword = await bcrypt.hash("diaztech2026", 12);
  const user = await prisma.user.upsert({
    where: { email: "jose@diaztech.com" },
    update: {},
    create: {
      email: "jose@diaztech.com",
      name: "José Díaz",
      password: hashedPassword,
      phone: "+5491155000000",
    },
  });
  console.log("✅ Usuario:", user.email);

  // 2. Create company
  const company = await prisma.company.create({
    data: {
      name: "DiazTech Demo S.R.L.",
      fantasyName: "DiazTech",
      email: "info@diaztech.com",
      phone: "+5491155000000",
      taxCategory: "Monotributista",
      address: "Av. Corrientes 1234, CABA",
      afipEnvironment: "testing",
    },
  });
  console.log("✅ Empresa:", company.name);

  // 3. Create membership
  await prisma.membership.create({
    data: {
      userId: user.id,
      companyId: company.id,
      role: "ADMIN",
    },
  });
  console.log("✅ Membership: ADMIN");

  // 4. Subscription (trial)
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  await prisma.subscription.create({
    data: {
      companyId: company.id,
      plan: "trial",
      status: "active",
      trialEnd,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
    },
  });
  console.log("✅ Suscripción: Trial 14 días");

  // 5. Warehouses
  const warehouses = ["Depósito Central", "Depósito Norte", "Depósito Sur"];
  for (const [i, name] of warehouses.entries()) {
    await prisma.warehouse.create({
      data: { companyId: company.id, name, isDefault: i === 0 },
    });
  }
  console.log("✅ Depósitos:", warehouses.join(", "));

  // 6. Categories
  const categories = ["Alimentos", "Bebidas", "Limpieza", "Electrónica", "Ferretería", "Papelería", "Textil", "Otros"];
  for (const name of categories) {
    await prisma.category.create({ data: { companyId: company.id, name } });
  }
  console.log("✅ Categorías:", categories.length);

  // 7. Sample clients
  const clients = [
    { name: "Distribuidora Norte S.R.L.", cuit: "30-71234567-8", phone: "1155001234", taxCategory: "Responsable Inscripto", balance: -245000 },
    { name: "Supermercado El Sol", cuit: "20-34567890-1", phone: "1166002345", taxCategory: "Responsable Inscripto", balance: 0 },
    { name: "María González", cuit: "", phone: "1177003456", taxCategory: "Consumidor Final", balance: 0 },
    { name: "Electro Hogar S.A.", cuit: "33-98765432-1", phone: "1188004567", taxCategory: "Responsable Inscripto", balance: -1350000 },
    { name: "Ferretería Don Pedro", cuit: "20-56789012-3", phone: "1199005678", taxCategory: "Monotributista", balance: -32000 },
  ];
  for (const c of clients) {
    await prisma.client.create({
      data: {
        companyId: company.id,
        name: c.name,
        cuit: c.cuit || null,
        phone: c.phone,
        taxCategory: c.taxCategory,
        balance: c.balance,
      },
    });
  }
  console.log("✅ Clientes:", clients.length);

  // 8. Sample suppliers
  const suppliers = [
    { name: "Alimentos del Sur S.A.", cuit: "30-99887766-5", balance: -850000 },
    { name: "Papelera Argentina S.R.L.", cuit: "33-55443322-1", balance: -120000 },
    { name: "Importadora Chang", cuit: "20-11223344-5", balance: 0 },
  ];
  for (const s of suppliers) {
    await prisma.supplier.create({
      data: {
        companyId: company.id,
        name: s.name,
        cuit: s.cuit,
        taxCategory: "Responsable Inscripto",
        balance: s.balance,
      },
    });
  }
  console.log("✅ Proveedores:", suppliers.length);

  // 9. Bank accounts
  await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      bankName: "Banco Nación",
      accountType: "CC",
      accountNumber: "4015-0012345678",
      cbu: "0110000000401500123456",
      alias: "DIAZTECH.NACION",
      currency: "ARS",
      balance: 2450000,
    },
  });
  await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      bankName: "Banco Galicia",
      accountType: "CA",
      cbu: "0070000000789000987654",
      alias: "DIAZTECH.GALICIA",
      currency: "ARS",
      balance: 890000,
    },
  });
  console.log("✅ Cuentas bancarias: 2");

  console.log("\n🎉 Seed completado!");
  console.log("───────────────────────────────");
  console.log("📧 Email:    jose@diaztech.com");
  console.log("🔑 Password: diaztech2026");
  console.log("───────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
