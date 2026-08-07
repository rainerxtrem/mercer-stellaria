import { prisma } from "@/lib/prisma";

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export async function buildChronologicalNumber(prefix: string, sequenceKey: string) {
  const currentDate = new Date();

  const sequence = await prisma.$transaction(async (tx) => {
    const existing = await tx.numberSequence.findUnique({ where: { key: sequenceKey } });

    if (!existing) {
      return tx.numberSequence.create({
        data: {
          key: sequenceKey,
          prefix,
          nextValue: 2,
        },
      });
    }

    return tx.numberSequence.update({
      where: { key: sequenceKey },
      data: {
        prefix,
        nextValue: { increment: 1 },
      },
    });
  });

  return `${prefix}-${formatDatePart(currentDate)}-${String(sequence.nextValue - 1).padStart(5, "0")}`;
}
