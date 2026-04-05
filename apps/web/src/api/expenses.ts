import { apiFetch } from './client';
import type { Expense } from './types';

export type CreateExpenseBody = {
  amount: number;
  payerId: string;
  description?: string;
  splitMode: 'EQUAL' | 'WEIGHT';
  participantIds?: string[];
  weightedParticipants?: { userId: string; weight: number }[];
};

export type UpdateExpenseBody = CreateExpenseBody;

export function listExpenses(
  spaceId: string,
  query?: { from?: string; to?: string },
) {
  const q = new URLSearchParams();
  if (query?.from) q.set('from', query.from);
  if (query?.to) q.set('to', query.to);
  const suffix = q.toString() ? `?${q}` : '';
  return apiFetch<Expense[]>(`/spaces/${spaceId}/expenses${suffix}`);
}

export function createExpense(spaceId: string, body: CreateExpenseBody) {
  return apiFetch<Expense>(`/spaces/${spaceId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateExpense(
  spaceId: string,
  expenseId: string,
  body: UpdateExpenseBody,
) {
  return apiFetch<Expense>(`/spaces/${spaceId}/expenses/${expenseId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteExpense(spaceId: string, expenseId: string) {
  return apiFetch<{ ok: boolean }>(
    `/spaces/${spaceId}/expenses/${expenseId}`,
    { method: 'DELETE' },
  );
}
