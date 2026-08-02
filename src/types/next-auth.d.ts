import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isActive: boolean;
      firstName?: string | null;
      lastName?: string | null;
      profileCompleted?: boolean;
      discordHandle?: string | null;
      isOwner?: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    isActive?: boolean;
    firstName?: string | null;
    lastName?: string | null;
    profileCompleted?: boolean;
    discordHandle?: string | null;
    isOwner?: boolean;
  }
}
