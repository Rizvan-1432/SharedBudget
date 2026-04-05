import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const schema = z
  .object({
    email: z.string().email('Некорректный email'),
    password: z.string().min(8, 'Минимум 8 символов'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Пароли не совпадают',
    path: ['confirm'],
  });

type Form = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: regAuth, user, ready } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/spaces';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Form>({ resolver: zodResolver(schema) });

  if (ready && user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data: Form) => {
    try {
      await regAuth(data.email, data.password);
      nav(from, { replace: true });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : 'Не удалось зарегистрироваться. Попробуйте снова.';
      setError('root', { message: msg });
    }
  };

  return (
    <div className="auth-card">
      <h1 className="auth-title">Регистрация</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="stack">
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" {...register('email')} />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && (
            <span className="error">{errors.password.message}</span>
          )}
        </label>
        <label className="field">
          <span>Пароль ещё раз</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
          />
          {errors.confirm && (
            <span className="error">{errors.confirm.message}</span>
          )}
        </label>
        {errors.root && <p className="error">{errors.root.message}</p>}
        <button type="submit" className="btn primary" disabled={isSubmitting}>
          {isSubmitting ? 'Создаём…' : 'Создать аккаунт'}
        </button>
      </form>
      <p className="muted small" style={{ marginTop: '1rem' }}>
        Уже есть аккаунт?{' '}
        <Link to="/login" state={loc.state}>
          Вход
        </Link>
      </p>
    </div>
  );
}
