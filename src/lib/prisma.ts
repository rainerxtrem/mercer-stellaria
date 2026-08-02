import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function hasExpectedModels(client: PrismaClient | undefined) {
  if (!client) {
    return false;
  }

  const runtimeClient = client as unknown as {
    claimMessage?: unknown;
    contactMessage?: unknown;
    contactConversationState?: unknown;
  };

  return (
    Boolean(runtimeClient.claimMessage) &&
    Boolean(runtimeClient.contactMessage) &&
    Boolean(runtimeClient.contactConversationState)
  );
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
}

const prismaClient = (() => {
  let client = globalThis.prismaGlobal ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production" && !hasExpectedModels(client)) {
    client = createPrismaClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = client;
  }

  return client;
})();

export const prisma = prismaClient;
