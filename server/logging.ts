import { randomUUID } from "crypto";

export interface LogContext {
  correlationId: string;
  userId?: string;
  stripeEventId?: string;
  stripeSubscriptionId?: string;
}

export function createCorrelationId(): string {
  return randomUUID();
}

export function logWebhookProcessing(
  context: LogContext,
  eventType: string,
  message: string,
  data?: any
) {
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      timestamp,
      type: "webhook",
      correlationId: context.correlationId,
      eventType,
      userId: context.userId,
      stripeEventId: context.stripeEventId,
      stripeSubscriptionId: context.stripeSubscriptionId,
      message,
      data,
    })
  );
}

export function logError(
  context: LogContext,
  message: string,
  error?: Error,
  data?: any
) {
  const timestamp = new Date().toISOString();
  console.error(
    JSON.stringify({
      timestamp,
      type: "error",
      correlationId: context.correlationId,
      userId: context.userId,
      message,
      error: error ? { message: error.message, stack: error.stack } : undefined,
      data,
    })
  );
}

export function logAuthError(
  correlationId: string,
  message: string,
  data?: any
) {
  const timestamp = new Date().toISOString();
  console.warn(
    JSON.stringify({
      timestamp,
      type: "auth_error",
      correlationId,
      message,
      data,
    })
  );
}
