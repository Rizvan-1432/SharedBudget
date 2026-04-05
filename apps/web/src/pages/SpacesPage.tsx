import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '../api/client';
import * as spacesApi from '../api/spaces';

const createSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
});

type CreateForm = z.infer<typeof createSchema>;

export function SpacesPage() {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ['spaces'],
    queryFn: () => spacesApi.listSpaces(),
  });

  const createMut = useMutation({
    mutationFn: (name: string) => spacesApi.createSpace(name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['spaces'] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const onCreate = (f: CreateForm) => {
    createMut.mutate(f.name, {
      onSuccess: () => reset(),
    });
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Пространства</h1>
        <p className="muted">
          Квартира, поездка или проект — общие траты и долги в одном месте.
        </p>
      </header>

      <section className="card stack">
        <h2 className="section-title">Новое пространство</h2>
        <form onSubmit={handleSubmit(onCreate)} className="row gap">
          <input
            className="grow"
            placeholder="Например: Поездка в Армению"
            {...register('name')}
          />
          <button
            type="submit"
            className="btn primary"
            disabled={createMut.isPending}
          >
            Создать
          </button>
        </form>
        {errors.name && <span className="error">{errors.name.message}</span>}
        {createMut.isError && (
          <span className="error">
            {createMut.error instanceof ApiError
              ? createMut.error.message
              : 'Ошибка создания'}
          </span>
        )}
      </section>

      <section className="stack" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Ваши пространства</h2>
        {isPending && <p className="muted">Загрузка…</p>}
        {error && <p className="error">Не удалось загрузить список</p>}
        {data && data.length === 0 && (
          <p className="muted">Пока нет пространств — создайте первое выше.</p>
        )}
        <ul className="space-list">
          {data?.map((s) => (
            <li key={s.id}>
              <Link to={`/spaces/${s.id}`} className="space-link">
                <span className="space-name">{s.name}</span>
                <span className="muted small">
                  {s.role === 'OWNER' ? 'владелец' : 'участник'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
