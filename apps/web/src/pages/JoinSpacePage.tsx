import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import * as spacesApi from '../api/spaces';
import { useAuth } from '../auth/AuthContext';

export function JoinSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [search] = useSearchParams();
  const tokenFromUrl = search.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const { user, ready } = useAuth();

  const joinMut = useMutation({
    mutationFn: () => {
      if (!spaceId) throw new Error('no id');
      return spacesApi.joinSpace(spaceId, token.trim());
    },
  });

  if (!spaceId) {
    return <Navigate to="/spaces" replace />;
  }

  if (ready && !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `/join/${spaceId}?token=${encodeURIComponent(token)}` }}
      />
    );
  }

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinMut.mutate();
  };

  if (joinMut.isSuccess) {
    return (
      <div className="auth-card">
        <h1 className="auth-title">Вы в пространстве</h1>
        <p className="muted">Можно перейти к тратам и балансам.</p>
        <Link to={`/spaces/${spaceId}`} className="btn primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Открыть
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Приглашение</h1>
      <p className="muted small">
        Введите токен из ссылки приглашения и присоединитесь к пространству.
      </p>
      <form onSubmit={onJoin} className="stack" style={{ marginTop: '1rem' }}>
        <label className="field">
          <span>Токен</span>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Токен из ссылки"
            required
          />
        </label>
        {joinMut.isError && (
          <p className="error">
            {joinMut.error instanceof ApiError
              ? joinMut.error.message
              : 'Не удалось вступить'}
          </p>
        )}
        <button type="submit" className="btn primary" disabled={joinMut.isPending}>
          {joinMut.isPending ? '…' : 'Вступить'}
        </button>
      </form>
      <p className="muted small" style={{ marginTop: '1rem' }}>
        <Link to="/spaces">← К списку</Link>
      </p>
    </div>
  );
}
