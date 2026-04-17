'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import logo from '@/assets/images/logo.jpg'
import { login } from '@/services/auth'

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
type LoginFormData = z.infer<typeof loginSchema>

export function LoginCard() {
  const router = useRouter()
  const [showPassword, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const isLoading = isSubmitting || isPending

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    try {
      const { user } = await login({ usernameOrEmail: data.usernameOrEmail, password: data.password })
      setIsPending(true)
      router.push(user.defaultDashboardPath || '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid username or password')
    }
  }

  const base = 'fl-input peer w-full h-14 rounded-xl border bg-white px-4 pt-5 pb-2 text-sm text-slate-900 outline-none transition-all duration-200 placeholder-transparent disabled:bg-slate-50 disabled:text-slate-400'
  const normal = 'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20'
  const errCls = 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-300/20'

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ boxShadow: '0 32px 80px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
    >
      {/* Accent bar */}
      <div
        className="w-full rounded-t-2xl"
        style={{ height: '8px', background: 'linear-gradient(90deg, #4F46E5, #818CF8, #A78BFA, #C084FC)' }}
      />

      {/* Logo */}
      <div className="flex flex-col items-center px-8 pt-8 pb-6 border-b border-slate-100">
        <Image src={logo} alt="Campus Connect" height={52} className="h-13 w-auto" priority />
        <p className="mt-3 text-xs font-medium tracking-widest text-slate-400 uppercase">
          Academic Management System
        </p>
      </div>

      {/* Form */}
      <div className="px-8 py-7">
        <div className="mb-6">
          <h1 className="text-[18px] font-bold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to access your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

          {/* Username */}
          <div className="relative">
            <input
              id="usernameOrEmail"
              type="text"
              placeholder=" "
              autoComplete="username"
              disabled={isLoading}
              suppressHydrationWarning
              className={`${base} ${errors.usernameOrEmail ? errCls : normal}`}
              {...register('usernameOrEmail')}
            />
            <label htmlFor="usernameOrEmail" className="fl-label">Username or Email</label>
            {errors.usernameOrEmail && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.usernameOrEmail.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder=" "
              autoComplete="current-password"
              disabled={isLoading}
              suppressHydrationWarning
              className={`${base} pr-11 ${errors.password ? errCls : normal}`}
              {...register('password')}
            />
            <label htmlFor="password" className="fl-label">Password</label>
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
            {errors.password && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 mt-2"
          >
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" data-animate="functional" aria-hidden="true" /> Signing in…</>
              : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  )
}
