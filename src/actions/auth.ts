"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function registerUser(formData: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
}): Promise<AuthResult> {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: formData.email },
    });

    if (existingUser) {
      return { success: false, error: "Ya existe una cuenta con este email" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(formData.password, 12);

    // Create user + company + membership in a transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: formData.name,
          email: formData.email,
          password: hashedPassword,
          phone: formData.phone || null,
        },
      });

      const companyName = formData.companyName?.trim() || `Empresa de ${formData.name}`;

      const company = await tx.company.create({
        data: {
          name: companyName,
          fantasyName: companyName,
          email: formData.email,
          phone: formData.phone || null,
        },
      });

      // Create admin membership
      await tx.membership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: "ADMIN",
        },
      });

      // Create default subscription (trial)
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: "trial",
          status: "active",
          trialEnd,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
        },
      });

      // Create default warehouses
      const warehouses = ["Depósito Central", "Depósito Norte", "Depósito Sur"];
      for (const [i, name] of warehouses.entries()) {
        await tx.warehouse.create({
          data: {
            companyId: company.id,
            name,
            isDefault: i === 0,
          },
        });
      }

      // Create default categories
      const categories = [
        "Alimentos", "Bebidas", "Limpieza", "Electrónica",
        "Ferretería", "Papelería", "Textil", "Otros",
      ];
      for (const name of categories) {
        await tx.category.create({
          data: { companyId: company.id, name },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Error al crear la cuenta. Intentá de nuevo." };
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Email o contraseña incorrectos" };
        default:
          return { success: false, error: "Error al iniciar sesión" };
      }
    }
    throw error;
  }
}
