import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const schema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type Form = z.infer<typeof schema>;

export function LoginPage() {
  const { login, user, ready } = useAuth();
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
      await login(data.email, data.password);
      nav(from, { replace: true });
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : 'Не удалось войти. Попробуйте снова.';
      setError('root', { message: msg });
    }
  };

  return (
    <div className="auth-card">
      <h1 className="auth-title">Вход</h1>
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
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <span className="error">{errors.password.message}</span>
          )}
        </label>
        {errors.root && <p className="error">{errors.root.message}</p>}
        <button type="submit" className="btn primary" disabled={isSubmitting}>
          {isSubmitting ? 'Входим…' : 'Войти'}
        </button>
      </form>
      <p className="muted small" style={{ marginTop: '1rem' }}>
        Нет аккаунта?{' '}
        <Link to="/register" state={loc.state}>
          Регистрация
        </Link>
      </p>
    </div>
  );
}
