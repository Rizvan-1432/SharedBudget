import { apiFetch } from './client';
import type { BalanceRow, SettlementRow } from './types';

export function listBalances(spaceId: string) {
  return apiFetch<BalanceRow[]>(`/spaces/${spaceId}/balances`);
}

export function listSettlements(spaceId: string) {
  return apiFetch<SettlementRow[]>(`/spaces/${spaceId}/settlements`);
}
