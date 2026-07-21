'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 30

interface OtpStepProps {
  /** Username/email awaiting verification — shown for context. */
  target: string
  /** Verify the entered code. Resolve to navigate; reject to surface an error. */
  onVerify: (code: string) => Promise<void>
  /** Re-request a code (re-runs the credentials phase). */
  onResend: () => Promise<void>
  /** Abandon the challenge and return to the credentials form. */
  onBack: () => void
}

/**
 * Two-factor verification step for evaluator logins. Ported from the standalone
 * ExamDigit app's OTP view; re-styled to match LoginCard and wired to the
 * iron-session BFF (the code never reaches the backend directly — LoginCard
 * re-submits credentials + code to /api/auth/login).
 */
export function OtpStep({ target, onVerify, onResend, onBack }: OtpStepProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [resending, setResending] = useState(false)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  // Guard so an auto-submit + a manual click don't both fire a verify.
  const submittedFor = useRef<string | null>(null)

  const code = digits.join('')

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const submit = useCallback(
    async (value: string) => {
      if (verifying || value.length !== OTP_LENGTH) return
      if (submittedFor.current === value) return
      submittedFor.current = value
      setVerifying(true)
      setError(null)
      try {
        await onVerify(value)
        // On success the parent navigates away; nothing else to do here.
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Invalid or expired code. Please try again.',
        )
        setDigits(Array(OTP_LENGTH).fill(''))
        submittedFor.current = null
        inputsRef.current[0]?.focus()
      } finally {
        setVerifying(false)
      }
    },
    [verifying, onVerify],
  )

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function onChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      setDigitAt(index, '')
      return
    }
    // Multi-char (autofill/paste into a single box) → distribute across boxes.
    if (cleaned.length > 1) {
      fillFrom(index, cleaned)
      return
    }
    setDigitAt(index, cleaned)
    if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus()
    const assembled = digits.slice(0, index).join('') + cleaned + digits.slice(index + 1).join('')
    if (assembled.length === OTP_LENGTH && !assembled.includes('')) void submit(assembled)
  }

  function fillFrom(startIndex: number, chars: string) {
    setDigits((prev) => {
      const next = [...prev]
      let i = startIndex
      for (const ch of chars) {
        if (i >= OTP_LENGTH) break
        next[i] = ch
        i++
      }
      const lastFilled = Math.min(startIndex + chars.length, OTP_LENGTH) - 1
      inputsRef.current[Math.min(lastFilled + 1, OTP_LENGTH - 1)]?.focus()
      const assembled = next.join('')
      if (assembled.length === OTP_LENGTH && !next.includes('')) void submit(assembled)
      return next
    })
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
      setDigitAt(index - 1, '')
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
      e.preventDefault()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
      e.preventDefault()
    }
  }

  function onPaste(index: number, e: React.ClipboardEvent<HTMLElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!text) return
    e.preventDefault()
    fillFrom(index, text)
  }

  async function handleResend() {
    if (cooldown > 0 || resending || verifying) return
    setResending(true)
    setError(null)
    try {
      await onResend()
      setDigits(Array(OTP_LENGTH).fill(''))
      submittedFor.current = null
      setCooldown(RESEND_COOLDOWN_SECONDS)
      inputsRef.current[0]?.focus()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not resend the code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Two-factor verification
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter the {OTP_LENGTH}-digit code for{' '}
            <span className="font-medium text-foreground">{target}</span>.
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-2" onPaste={(e) => onPaste(0, e)}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={verifying}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            aria-label={`Digit ${i + 1}`}
            className="h-12 w-11 rounded-md border border-border bg-card text-center text-lg font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-muted/40 disabled:text-muted-foreground"
          />
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit(code)}
        disabled={verifying || code.length !== OTP_LENGTH}
        className="w-full h-12 rounded-md text-[14px] font-semibold tracking-[0.08em] text-white bg-[hsl(210,55%,15%)] hover:bg-[hsl(210,55%,12%)] active:scale-[0.99] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        {verifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> VERIFYING…
          </>
        ) : (
          'VERIFY & SIGN IN'
        )}
      </button>

      <div className="flex items-center justify-between text-[13px]">
        <button
          type="button"
          onClick={onBack}
          disabled={verifying}
          className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to sign in
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || verifying}
          className="font-medium text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {resending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  )
}
