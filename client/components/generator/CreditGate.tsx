interface CreditGateProps {
  creditsRemaining: number;
  creditsRequired: number;
  actionName: string;
  onBlocked: (reason: string) => void;
  onAllowed: () => void;
}

/**
 * CreditGate checks if user has enough credits for an action.
 * If blocked, calls onBlocked with a reason message.
 * If allowed, calls onAllowed to proceed with the action.
 */
export function checkCredits({
  creditsRemaining,
  creditsRequired,
  actionName,
  onBlocked,
  onAllowed,
}: CreditGateProps): void {
  if (creditsRemaining < creditsRequired) {
    const deficit = creditsRequired - creditsRemaining;
    onBlocked(
      `You need ${creditsRequired} credits to ${actionName}, but only have ${creditsRemaining}. You're short by ${deficit} credits.`
    );
  } else {
    onAllowed();
  }
}

/**
 * Hook-style validator for credit gates
 */
export function useCreditGate(
  creditsRemaining: number,
  creditsRequired: number
): {
  hasEnoughCredits: boolean;
  deficit: number;
  message: string;
} {
  const hasEnoughCredits = creditsRemaining >= creditsRequired;
  const deficit = Math.max(0, creditsRequired - creditsRemaining);
  const message = hasEnoughCredits
    ? "You have enough credits"
    : `You need ${deficit} more credits`;

  return { hasEnoughCredits, deficit, message };
}
