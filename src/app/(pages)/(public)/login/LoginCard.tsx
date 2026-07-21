'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { Eye, EyeOff, Mail, AlertCircle, Loader2 } from 'lucide-react'
import logo from '@/assets/images/logo.jpg'
import { login } from '@/services/auth'
import { OtpStep } from './OtpStep'

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})
type LoginFormData = z.infer<typeof loginSchema>

export function LoginCard() {
  const router = useRouter()
  const [showPassword, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  // 'credentials' → username/password form; 'otp' → evaluator two-factor step.
  const [phase, setPhase] = useState<'credentials' | 'otp'>('credentials')
  // Credentials held in memory only between the OTP prompt and its verification.
  // Never persisted — cleared once the challenge resolves or is cancelled.
  const pendingCreds = useRef<{ usernameOrEmail: string; password: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const isLoading = isSubmitting || isPending

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    try {
      const result = await login({
        usernameOrEmail: data.usernameOrEmail,
        password: data.password,
      })
      if (result.otpRequired) {
        // Evaluator account — hold creds in memory and switch to the OTP step.
        pendingCreds.current = { usernameOrEmail: data.usernameOrEmail, password: data.password }
        setPhase('otp')
        return
      }
      setIsPending(true)
      router.push(result.user?.defaultDashboardPath || '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid username or password')
    }
  }

  const verifyOtp = async (code: string) => {
    const creds = pendingCreds.current
    if (!creds) throw new Error('Your session timed out. Please sign in again.')
    const result = await login({ ...creds, otp: code })
    if (!result.user) throw new Error('Invalid or expired code. Please try again.')
    pendingCreds.current = null
    setIsPending(true)
    router.push(result.user.defaultDashboardPath || '/dashboard')
  }

  const resendOtp = async () => {
    const creds = pendingCreds.current
    if (!creds) throw new Error('Your session timed out. Please sign in again.')
    // Re-run the credentials phase; issues a fresh challenge (real OTP once wired).
    await login(creds)
  }

  const backToCredentials = () => {
    pendingCreds.current = null
    setError(null)
    setPhase('credentials')
  }

  const inputBase =
    'fl-input peer w-full h-14 rounded-md border bg-card px-4 pt-5 pb-2 text-[15px] text-foreground outline-none transition-colors duration-150 placeholder-transparent disabled:bg-muted/40 disabled:text-muted-foreground'
  const inputNormal = 'border-border focus:border-primary focus:ring-2 focus:ring-primary/15'
  const inputError = 'border-destructive/60 focus:border-destructive focus:ring-2 focus:ring-destructive/20'

  return (
    <div className="rounded-xl bg-card border border-border shadow-md overflow-hidden">
      {/* Brand */}
      <div className="flex flex-col items-center px-8 pt-8 pb-4">
        <Image
          src={logo}
          alt="Campus Connect"
          height={48}
          className="h-12 w-auto"
          priority
        />
      </div>

      {/* Title */}
      <div className="px-8 pb-6 text-center">
        <h1
          className="text-[20px] font-semibold tracking-[0.04em] text-foreground"
          style={{ fontFamily: 'var(--font-heading), Sora, system-ui, sans-serif' }}
        >
          LOGIN
        </h1>
      </div>

      {phase === 'otp' ? (
        <div className="px-8 pb-8">
          <OtpStep
            target={pendingCreds.current?.usernameOrEmail ?? ''}
            onVerify={verifyOtp}
            onResend={resendOtp}
            onBack={backToCredentials}
          />
        </div>
      ) : (
      /* Form */
      <div className="px-8 pb-8">
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
              className={`${inputBase} pr-11 ${errors.usernameOrEmail ? inputError : inputNormal}`}
              {...register('usernameOrEmail')}
            />
            <label htmlFor="usernameOrEmail" className="fl-label">
              Email Or Username*
            </label>
            <Mail
              className="pointer-events-none absolute inset-y-0 right-3.5 my-auto h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            {errors.usernameOrEmail && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
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
              className={`${inputBase} pr-11 ${errors.password ? inputError : inputNormal}`}
              {...register('password')}
            />
            <label htmlFor="password" className="fl-label">Password</label>
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
            {errors.password && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Remember / Forgot */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={isLoading}
                className="h-4 w-4 rounded border-border accent-primary"
                {...register('remember')}
              />
              Remember Me
            </label>
            <a
              href="#"
              className="text-[13px] font-medium text-primary hover:underline"
              tabIndex={-1}
            >
              Forgot Password?
            </a>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-md text-[14px] font-semibold tracking-[0.08em] text-white bg-[hsl(210,55%,15%)] hover:bg-[hsl(210,55%,12%)] active:scale-[0.99] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 mt-2"
          >
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" data-animate="functional" aria-hidden="true" /> SIGNING IN…</>
              : 'LOGIN'}
          </button>

        </form>
      </div>
      )}
    </div>
  )
}
