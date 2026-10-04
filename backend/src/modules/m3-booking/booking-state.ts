import { BookingStatus as S } from '../../common/enums';

/**
 * Bảng chuyển trạng thái hợp lệ của buổi học (bắt buộc đúng như đặc tả):
 *  PENDING_PAYMENT -> EXPIRED | CONFIRMED | CANCELLED
 *  CONFIRMED -> CANCELLED | AWAITING_CONFIRMATION
 *  AWAITING_CONFIRMATION -> COMPLETED | DISPUTED
 *  DISPUTED -> COMPLETED | REFUNDED
 */
export const TRANSITIONS: Record<S, S[]> = {
  [S.PENDING_PAYMENT]: [S.EXPIRED, S.CONFIRMED, S.CANCELLED],
  [S.CONFIRMED]: [S.CANCELLED, S.AWAITING_CONFIRMATION],
  [S.AWAITING_CONFIRMATION]: [S.COMPLETED, S.DISPUTED],
  [S.DISPUTED]: [S.COMPLETED, S.REFUNDED],
  [S.EXPIRED]: [],
  [S.CANCELLED]: [],
  [S.COMPLETED]: [],
  [S.REFUNDED]: [],
};

export function canTransition(from: S, to: S): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(public from: S, public to: S) {
    super(`Không thể chuyển buổi học từ ${from} sang ${to}`);
  }
}

export function assertTransition(from: S, to: S) {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Trạng thái còn giữ slot (activeSlotKey != null) */
export const ACTIVE_STATUSES: S[] = [S.PENDING_PAYMENT, S.CONFIRMED, S.AWAITING_CONFIRMATION, S.COMPLETED, S.DISPUTED];
export const isTerminal = (s: S) => TRANSITIONS[s].length === 0;
