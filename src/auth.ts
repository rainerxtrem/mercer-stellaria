import type { NextAuthOptions } from "next-auth";
import Discord from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";

function parseRoleIds(value: string | undefined) {
  if (!value) {
    return new Set<string>();
  }

  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function resolveRoleFromDiscordRoleIds(roleIds: string[]) {
  const adminRoles = parseRoleIds(process.env.DISCORD_ROLE_ADMIN_IDS);
  const collaboratorRoles = parseRoleIds(process.env.DISCORD_ROLE_COLLABORATOR_IDS);
  const clientRoles = parseRoleIds(process.env.DISCORD_ROLE_CLIENT_IDS);

  if (roleIds.some((roleId) => adminRoles.has(roleId))) {
    return UserRole.ADMIN;
  }

  if (roleIds.some((roleId) => collaboratorRoles.has(roleId))) {
    return UserRole.COLLABORATOR;
  }

  if (roleIds.some((roleId) => clientRoles.has(roleId))) {
    return UserRole.CLIENT;
  }

  return null;
}

async function fetchGuildMemberRoleIds(accessToken: string | undefined) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId || !accessToken) {
    return [];
  }

  const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => null);

  if (!response?.ok) {
    return [];
  }

  const payload = (await response.json()) as { roles?: unknown };
  if (!Array.isArray(payload.roles)) {
    return [];
  }

  return payload.roles.filter((value): value is string => typeof value === "string");
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
      const accessToken = typeof account?.access_token === "string" ? account.access_token : undefined;
      const username = typeof rawProfile?.username === "string" ? rawProfile.username : undefined;
      const discriminator = typeof rawProfile?.discriminator === "string" ? rawProfile.discriminator : undefined;
      const discordHandle = username
        ? discriminator && discriminator !== "0"
          ? `${username}#${discriminator}`
          : username
        : undefined;

      const memberRoleIds = await fetchGuildMemberRoleIds(accessToken);
      const discordMappedRole = resolveRoleFromDiscordRoleIds(memberRoleIds);
      // Never grant elevated access by account creation order.
      // Elevated roles must come from Discord mapping or an existing DB role.
      const fallbackRole = existingUser?.role ?? UserRole.CLIENT;
      const roleToApply = discordMappedRole ?? fallbackRole;

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
          role: roleToApply,
          isActive: true,
        },
        create: {
          email: user.email,
          fullName: user.name ?? "Utilisateur Discord",
          avatarUrl: user.image ?? null,
          discordId: discordId ?? null,
          discordHandle: discordHandle ?? null,
          role: roleToApply,
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
      }

      return session;
    },
  },
};
