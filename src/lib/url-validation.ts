import { z } from "zod";

export const optionalHttpUrlSchema = z
  .string()
  .max(2048)
  .url("URL invalide")
  .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
    message: "Seules les URLs http(s) sont autorisées.",
  })
  .optional()
  .or(z.literal(""));
