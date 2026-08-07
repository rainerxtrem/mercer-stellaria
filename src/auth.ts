import type { NextAuthOptions } from "next-auth";
import Discord from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";
import { ensureRbacBootstrap, getEffectivePermissionContext, inferRoleFromPermissions } from "@/lib/grade-permissions";

const OWNER_DISCORD_HANDLE = (process.env.OWNER_DISCORD_HANDLE ?? "baptiste_72").toLowerCase();
const OWNER_PROFILE = {
  firstName: "William",
  lastName: "Stellaria",
  fullName: "William Stellaria",
  birthDate: new Date("1992-05-10T00:00:00.000Z"),
  phone: "555-87344",
  citizenUniqueId: "ADMIN-OWNER-0001",
  riskScore: 0,
  riskLabel: "Risque faible",
  profileCompleted: true,
} as const;

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

      await ensureRbacBootstrap();

      const persistedUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          fullName:
            isOwner
              ? OWNER_PROFILE.fullName
              : existingUser?.profileCompleted && existingUser.fullName
                ? existingUser.fullName
                : user.name ?? existingUser?.fullName ?? "Utilisateur Discord",
          firstName: isOwner ? OWNER_PROFILE.firstName : existingUser?.firstName ?? null,
          lastName: isOwner ? OWNER_PROFILE.lastName : existingUser?.lastName ?? null,
          birthDate: isOwner ? OWNER_PROFILE.birthDate : existingUser?.birthDate ?? null,
          phone: isOwner ? OWNER_PROFILE.phone : existingUser?.phone ?? null,
          citizenUniqueId: isOwner ? OWNER_PROFILE.citizenUniqueId : existingUser?.citizenUniqueId ?? null,
          riskScore: isOwner ? OWNER_PROFILE.riskScore : existingUser?.riskScore ?? null,
          riskLabel: isOwner ? OWNER_PROFILE.riskLabel : existingUser?.riskLabel ?? null,
          profileCompleted: isOwner ? OWNER_PROFILE.profileCompleted : existingUser?.profileCompleted ?? false,
          avatarUrl: user.image ?? null,
          discordId: discordId ?? null,
          discordHandle: discordHandle ?? null,
          role: isOwner ? UserRole.ADMIN : roleToApply,
          isActive: true,
        },
        create: {
          email: user.email,
          fullName: isOwner ? OWNER_PROFILE.fullName : user.name ?? "Utilisateur Discord",
          firstName: isOwner ? OWNER_PROFILE.firstName : null,
          lastName: isOwner ? OWNER_PROFILE.lastName : null,
          birthDate: isOwner ? OWNER_PROFILE.birthDate : null,
          phone: isOwner ? OWNER_PROFILE.phone : null,
          citizenUniqueId: isOwner ? OWNER_PROFILE.citizenUniqueId : null,
          riskScore: isOwner ? OWNER_PROFILE.riskScore : null,
          riskLabel: isOwner ? OWNER_PROFILE.riskLabel : null,
          avatarUrl: user.image ?? null,
          discordId: discordId ?? null,
          discordHandle: discordHandle ?? null,
          role: isOwner ? UserRole.ADMIN : roleToApply,
          profileCompleted: isOwner ? OWNER_PROFILE.profileCompleted : false,
        },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (isOwner) {
        const ceoGrade = await prisma.grade.findUnique({ where: { code: "CHIEF_EXECUTIVE_OFFICER" }, select: { id: true } });

        if (ceoGrade) {
          await prisma.userGrade.upsert({
            where: {
              userId_gradeId: {
                userId: persistedUser.id,
                gradeId: ceoGrade.id,
              },
            },
            update: {},
            create: {
              userId: persistedUser.id,
              gradeId: ceoGrade.id,
            },
          });
        }
      }

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
          const permissionContext = await getEffectivePermissionContext(dbUser.id);
          const inferredRole = inferRoleFromPermissions(permissionContext.role, permissionContext.permissions);

          const routeBindings = await prisma.routePermissionBinding.findMany({
            where: { isEnabled: true },
            select: {
              pattern: true,
              matchType: true,
              resource: { select: { key: true } },
            },
          });

          token.userId = dbUser.id;
          token.role = inferredRole;
          token.isActive = dbUser.isActive;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.profileCompleted = dbUser.profileCompleted;
          token.discordHandle = dbUser.discordHandle;
          token.isOwner = normalizeDiscordHandle(dbUser.discordHandle ?? undefined) === OWNER_DISCORD_HANDLE;
          token.grades = permissionContext.grades;
          token.permissions = permissionContext.permissions;
          token.permissionRouteRules = routeBindings.map((binding) => ({
            pattern: binding.pattern,
            matchType: binding.matchType,
            permissionKey: binding.resource.key,
          }));
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
        session.user.grades = Array.isArray(token.grades) ? token.grades.filter((grade): grade is string => typeof grade === "string") : [];
        session.user.permissions = Array.isArray(token.permissions)
          ? token.permissions.filter((permission): permission is string => typeof permission === "string")
          : [];
      }

      return session;
    },
  },
};
