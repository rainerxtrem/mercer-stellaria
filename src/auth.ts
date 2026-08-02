import type { NextAuthOptions } from "next-auth";
import Discord from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";

const OWNER_DISCORD_HANDLE = (process.env.OWNER_DISCORD_HANDLE ?? "baptiste_72").toLowerCase();

function normalizeDiscordHandle(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.split("#")[0] ?? normalized;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID ?? "",
      clientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
      authorization: {
        params: {
          scope: "identify email guilds guilds.members.read",
        },
      },
    }),
  ],
  pages: {
    signIn: "/connexion",
  },
  callbacks: {
    async signIn({ user, profile, account }) {
      if (!user.email) {
        return false;
      }

      const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
      const rawProfile = profile as Record<string, unknown> | undefined;
      const discordId = account?.providerAccountId;
      const username = typeof rawProfile?.username === "string" ? rawProfile.username : undefined;
      const discriminator = typeof rawProfile?.discriminator === "string" ? rawProfile.discriminator : undefined;
      const discordHandle = username
        ? discriminator && discriminator !== "0"
          ? `${username}#${discriminator}`
          : username
        : undefined;
      const isOwner = normalizeDiscordHandle(discordHandle) === OWNER_DISCORD_HANDLE;
      const roleToApply = existingUser?.role ?? (isOwner ? UserRole.ADMIN : UserRole.CLIENT);

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          fullName:
            existingUser?.profileCompleted && existingUser.fullName
              ? existingUser.fullName
              : user.name ?? existingUser?.fullName ?? "Utilisateur Discord",
          avatarUrl: user.image ?? null,
          discordId: discordId ?? null,
          discordHandle: discordHandle ?? null,
          role: isOwner ? UserRole.ADMIN : roleToApply,
          isActive: true,
        },
        create: {
          email: user.email,
          fullName: user.name ?? "Utilisateur Discord",
          avatarUrl: user.image ?? null,
          discordId: discordId ?? null,
          discordHandle: discordHandle ?? null,
          role: isOwner ? UserRole.ADMIN : roleToApply,
          profileCompleted: false,
        },
      });

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser?.isActive) {
        return false;
      }

      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.isActive = dbUser.isActive;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.profileCompleted = dbUser.profileCompleted;
          token.discordHandle = dbUser.discordHandle;
          token.isOwner = normalizeDiscordHandle(dbUser.discordHandle ?? undefined) === OWNER_DISCORD_HANDLE;
          token.name = dbUser.fullName;
          token.picture = dbUser.avatarUrl ?? token.picture;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : "";
        session.user.role = typeof token.role === "string" ? token.role : "PUBLIC";
        session.user.isActive = Boolean(token.isActive);
        session.user.firstName = typeof token.firstName === "string" ? token.firstName : null;
        session.user.lastName = typeof token.lastName === "string" ? token.lastName : null;
        session.user.profileCompleted = Boolean(token.profileCompleted);
        session.user.discordHandle = typeof token.discordHandle === "string" ? token.discordHandle : null;
        session.user.isOwner = Boolean(token.isOwner);
      }

      return session;
    },
  },
};
