import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import * as balancesApi from '../api/balances';
import type { CreateExpenseBody } from '../api/expenses';
import * as expensesApi from '../api/expenses';
import type { Expense } from '../api/types';
import * as spacesApi from '../api/spaces';
import { useAuth } from '../auth/AuthContext';

export function SpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const invalidateExpenseRelated = () => {
    void qc.invalidateQueries({ queryKey: ['expenses', spaceId] });
    void qc.invalidateQueries({ queryKey: ['balances', spaceId] });
    void qc.invalidateQueries({ queryKey: ['settlements', spaceId] });
  };

  const spaceQ = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => spacesApi.getSpace(spaceId!),
    enabled: !!spaceId,
  });

  const membersQ = useQuery({
    queryKey: ['members', spaceId],
    queryFn: () => spacesApi.listMembers(spaceId!),
    enabled: !!spaceId,
  });

  const balancesQ = useQuery({
    queryKey: ['balances', spaceId],
    queryFn: () => balancesApi.listBalances(spaceId!),
    enabled: !!spaceId,
  });

  const settlementsQ = useQuery({
    queryKey: ['settlements', spaceId],
    queryFn: () => balancesApi.listSettlements(spaceId!),
    enabled: !!spaceId,
  });

  const expensesQ = useQuery({
    queryKey: ['expenses', spaceId, from, to],
    queryFn: () =>
      expensesApi.listExpenses(spaceId!, {
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: !!spaceId,
  });

  const deleteSpaceMut = useMutation({
    mutationFn: () => spacesApi.deleteSpace(spaceId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['spaces'] });
      nav('/spaces');
    },
  });

  const renameMut = useMutation({
    mutationFn: (name: string) => spacesApi.updateSpace(spaceId!, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['space', spaceId] });
      void qc.invalidateQueries({ queryKey: ['spaces'] });
    },
  });

  const isOwner = spaceQ.data && user && spaceQ.data.ownerId === user.id;
  const inviteUrl = useMemo(() => {
    if (!spaceId || !spaceQ.data?.inviteToken) return '';
    const t = encodeURIComponent(spaceQ.data.inviteToken);
    return `${window.location.origin}/join/${spaceId}?token=${t}`;
  }, [spaceId, spaceQ.data?.inviteToken]);

  if (!spaceId) return null;

  if (spaceQ.isError) {
    return (
      <div className="page">
        <p className="error">
          {spaceQ.error instanceof ApiError
            ? spaceQ.error.message
            : 'Нет доступа или пространство не найдено'}
        </p>
        <Link to="/spaces">← Назад</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/spaces" className="muted">
          Пространства
        </Link>
        <span className="muted"> / </span>
        <span>{spaceQ.data?.name ?? '…'}</span>
      </p>

      <header className="page-head">
        <h1 className="page-title">{spaceQ.data?.name ?? 'Загрузка…'}</h1>
      </header>

      {isOwner && spaceQ.data?.inviteToken && (
        <section className="card stack">
          <h2 className="section-title">Приглашение</h2>
          <p className="muted small">
            Отправьте ссылку участникам. Токен виден только вам как владельцу.
          </p>
          <div className="row gap wrap">
            <input readOnly className="grow mono small" value={inviteUrl} />
            <button
              type="button"
              className="btn secondary"
              onClick={() => void navigator.clipboard.writeText(inviteUrl)}
            >
              Копировать
            </button>
          </div>
        </section>
      )}

      {isOwner && (
        <section className="card stack">
          <h2 className="section-title">Настройки</h2>
          <RenameForm
            initial={spaceQ.data?.name ?? ''}
            onSave={(name) => renameMut.mutate(name)}
            pending={renameMut.isPending}
          />
          <button
            type="button"
            className="btn danger ghost"
            disabled={deleteSpaceMut.isPending}
            onClick={() => {
              if (
                confirm(
                  'Удалить пространство и все траты? Действие необратимо.',
                )
              ) {
                deleteSpaceMut.mutate();
              }
            }}
          >
            Удалить пространство
          </button>
          {renameMut.isError && (
            <span className="error">
              {renameMut.error instanceof ApiError
                ? renameMut.error.message
                : 'Ошибка'}
            </span>
          )}
        </section>
      )}

      <section className="grid-2">
        <div className="card stack">
          <h2 className="section-title">Балансы</h2>
          {balancesQ.isPending && <p className="muted">…</p>}
          <ul className="plain-list">
            {balancesQ.data?.map((b) => (
              <li key={b.userId} className="row spread">
                <span>{b.email}</span>
                <span
                  className={
                    Number(b.balance) > 0
                      ? 'pos'
                      : Number(b.balance) < 0
                        ? 'neg'
                        : ''
                  }
                >
                  {Number(b.balance) > 0 ? '+' : ''}
                  {b.balance}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Плюс — вам должны, минус — вы должны (относительно группы).
          </p>
        </div>

        <div className="card stack">
          <h2 className="section-title">Кому перевести</h2>
          {settlementsQ.isPending && <p className="muted">…</p>}
          <ul className="plain-list">
            {settlementsQ.data?.map((s, i) => (
              <li key={i}>
                <strong>{s.fromEmail ?? s.fromUserId}</strong> →{' '}
                <strong>{s.toEmail ?? s.toUserId}</strong>
                <span className="muted"> — {s.amount}</span>
              </li>
            ))}
          </ul>
          {settlementsQ.data?.length === 0 && (
            <p className="muted small">Все сошлось.</p>
          )}
        </div>
      </section>

      <section className="card stack">
        <h2 className="section-title">Участники</h2>
        <ul className="plain-list">
          {membersQ.data?.map((m) => (
            <li key={m.memberId}>
              {m.email}{' '}
              <span className="muted small">
                {m.role === 'OWNER' ? 'владелец' : 'участник'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <h2 className="section-title">Траты</h2>
        <div className="row gap wrap" style={{ marginBottom: '1rem' }}>
          <label className="field inline">
            <span className="muted small">С</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="field inline">
            <span className="muted small">По</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        {membersQ.data && user && (
          <ExpenseFormBlock
            spaceId={spaceId}
            members={membersQ.data}
            currentUserId={user.id}
            onDone={invalidateExpenseRelated}
          />
        )}

        {expensesQ.isPending && <p className="muted">Загрузка трат…</p>}
        <ul className="expense-list">
          {expensesQ.data?.map((ex) => (
            <li
              key={ex.id}
              className={
                editingExpenseId === ex.id
                  ? 'expense-row expense-row--editing'
                  : 'expense-row'
              }
            >
              {editingExpenseId === ex.id && membersQ.data && user ? (
                <ExpenseFormBlock
                  spaceId={spaceId}
                  members={membersQ.data}
                  currentUserId={user.id}
                  editTarget={ex}
                  onCancelEdit={() => setEditingExpenseId(null)}
                  onDone={() => {
                    setEditingExpenseId(null);
                    invalidateExpenseRelated();
                  }}
                />
              ) : (
                <>
                  <div>
                    <strong>{ex.amount}</strong>
                    <span className="muted small">
                      {' '}
                      · платил(а) {ex.payer.email}
                    </span>
                    {ex.description && (
                      <div className="muted small">{ex.description}</div>
                    )}
                    <div className="muted small">
                      {new Date(ex.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="expense-actions">
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => setEditingExpenseId(ex.id)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => {
                        if (!confirm('Удалить трату?')) return;
                        void expensesApi
                          .deleteExpense(spaceId, ex.id)
                          .then(() => invalidateExpenseRelated());
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RenameForm({
  initial,
  onSave,
  pending,
}: {
  initial: string;
  onSave: (name: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial);
  useEffect(() => {
    setName(initial);
  }, [initial]);
  return (
    <form
      className="row gap"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
    >
      <input
        className="grow"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="btn secondary" disabled={pending}>
        Сохранить название
      </button>
    </form>
  );
}

function ExpenseFormBlock({
  spaceId,
  members,
  currentUserId,
  onDone,
  editTarget,
  onCancelEdit,
}: {
  spaceId: string;
  members: { userId: string; email: string }[];
  currentUserId: string;
  onDone: () => void;
  editTarget?: Expense;
  onCancelEdit?: () => void;
}) {
  const isEdit = Boolean(editTarget);

  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(currentUserId);
  const [description, setDescription] = useState('');
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'WEIGHT'>('EQUAL');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(members.map((m) => m.userId)),
  );
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    for (const m of members) w[m.userId] = 1;
    return w;
  });

  useEffect(() => {
    if (!editTarget) return;
    setAmount(editTarget.amount);
    setPayerId(editTarget.payerId);
    setDescription(editTarget.description ?? '');
    const mode =
      editTarget.splits[0]?.mode === 'WEIGHT' ? 'WEIGHT' : 'EQUAL';
    setSplitMode(mode);
    setSelected(new Set(editTarget.splits.map((s) => s.userId)));
    const w: Record<string, number> = {};
    for (const m of members) {
      const sp = editTarget.splits.find((x) => x.userId === m.userId);
      w[m.userId] =
        sp?.weight != null && sp.weight !== ''
          ? parseFloat(sp.weight)
          : 1;
    }
    setWeights(w);
  }, [editTarget?.id, editTarget?.updatedAt]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const n = Number(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0.01) {
      setErr('Укажите сумму от 0.01');
      return;
    }
    const ids = [...selected];
    if (ids.length === 0) {
      setErr('Выберите хотя бы одного участника деления');
      return;
    }

    const body: CreateExpenseBody = {
      amount: n,
      payerId,
      description: description.trim() || undefined,
      splitMode,
    };
    if (splitMode === 'EQUAL') {
      body.participantIds = ids;
    } else {
      body.weightedParticipants = ids.map((userId) => ({
        userId,
        weight: weights[userId] ?? 1,
      }));
    }

    setSubmitting(true);
    try {
      if (isEdit && editTarget) {
        await expensesApi.updateExpense(spaceId, editTarget.id, body);
      } else {
        await expensesApi.createExpense(spaceId, body);
        setAmount('');
        setDescription('');
      }
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="stack expense-form">
      <h3 className="subsection-title">
        {isEdit ? 'Изменить трату' : 'Добавить трату'}
      </h3>
      <div className="row gap wrap">
        <label className="field">
          <span>Сумма</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <label className="field">
          <span>Кто платил</span>
          <select
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Описание (необязательно)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <fieldset className="fieldset">
        <legend className="muted small">Как делить</legend>
        <label className="radio">
          <input
            type="radio"
            checked={splitMode === 'EQUAL'}
            onChange={() => setSplitMode('EQUAL')}
          />
          Поровну
        </label>
        <label className="radio">
          <input
            type="radio"
            checked={splitMode === 'WEIGHT'}
            onChange={() => setSplitMode('WEIGHT')}
          />
          По долям
        </label>
      </fieldset>

      <div className="stack">
        <span className="muted small">Участники деления</span>
        {members.map((m) => (
          <label key={m.userId} className="check-row">
            <input
              type="checkbox"
              checked={selected.has(m.userId)}
              onChange={() => toggle(m.userId)}
            />
            <span>{m.email}</span>
            {splitMode === 'WEIGHT' && selected.has(m.userId) && (
              <input
                type="number"
                className="weight-inp"
                min={0.0001}
                step="any"
                value={weights[m.userId] ?? 1}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    [m.userId]: Number(e.target.value) || 1,
                  }))
                }
              />
            )}
          </label>
        ))}
      </div>

      {err && <p className="error">{err}</p>}
      <div className="row gap wrap">
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting
            ? 'Сохраняем…'
            : isEdit
              ? 'Сохранить'
              : 'Добавить'}
        </button>
        {isEdit && onCancelEdit && (
          <button
            type="button"
            className="btn ghost"
            disabled={submitting}
            onClick={() => onCancelEdit()}
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
