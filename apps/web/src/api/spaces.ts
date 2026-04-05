import { apiFetch } from './client';
import type { Member, SpaceDetail, SpaceListItem } from './types';

export function listSpaces() {
  return apiFetch<SpaceListItem[]>('/spaces');
}

export function getSpace(id: string) {
  return apiFetch<SpaceDetail>(`/spaces/${id}`);
}

export function createSpace(name: string) {
  return apiFetch<SpaceDetail>('/spaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function updateSpace(id: string, name: string) {
  return apiFetch<SpaceDetail>(`/spaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export function deleteSpace(id: string) {
  return apiFetch<{ ok: boolean }>(`/spaces/${id}`, { method: 'DELETE' });
}

export function joinSpace(spaceId: string, inviteToken: string) {
  return apiFetch<SpaceDetail>(`/spaces/${spaceId}/join`, {
    method: 'POST',
    body: JSON.stringify({ inviteToken }),
  });
}

export function listMembers(spaceId: string) {
  return apiFetch<Member[]>(`/spaces/${spaceId}/members`);
}
