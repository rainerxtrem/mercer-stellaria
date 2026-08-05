import { NotificationSeverity, NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type NotificationPayload = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  link?: string | null;
};

export async function createAppNotification(payload: NotificationPayload) {
  await prisma.appNotification.create({
    data: {
      recipientId: payload.recipientId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      severity: payload.severity ?? NotificationSeverity.INFO,
      link: payload.link ?? null,
    },
  });
}

export async function createAppNotificationSafe(payload: NotificationPayload) {
  try {
    await createAppNotification(payload);
  } catch {
    // Silent by design: notifications should not break main actions.
  }
}
