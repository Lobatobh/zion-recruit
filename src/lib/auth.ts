import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      tenantId: string | null;
      tenantSlug: string | null;
      role: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    tenantId?: string | null;
    tenantSlug?: string | null;
    role?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    tenantId?: string | null;
    tenantSlug?: string | null;
    role?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("No credentials provided");
            return null;
          }

          console.log("Attempting login for:", credentials.email);

          const user = await db.user.findUnique({
            where: { email: credentials.email },
            include: {
              memberships: {
                include: {
                  tenant: true,
                },
                orderBy: { joinedAt: "asc" },
                take: 1,
              },
            },
          });

          if (!user) {
            console.log("User not found:", credentials.email);
            return null;
          }

          if (!user.password) {
            console.log("User has no password");
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) {
            console.log("Password mismatch for:", credentials.email);
            return null;
          }

          const primaryMembership = user.memberships[0];

          console.log("Login successful for:", credentials.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            tenantId: primaryMembership?.tenantId ?? null,
            tenantSlug: primaryMembership?.tenant?.slug ?? null,
            role: primaryMembership?.role ?? null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.tenantId = token.tenantId ?? null;
      session.user.tenantSlug = token.tenantSlug ?? null;
      session.user.role = token.role ?? null;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "zion-recruit-secret-key-change-in-production",
  debug: true,
};
