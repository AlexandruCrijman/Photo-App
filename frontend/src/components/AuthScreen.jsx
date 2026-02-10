export function AuthScreen({
  title,
  subtitle,
  avatarUrl,
  inputValue,
  onInputChange,
  inputPlaceholder = 'Enter password',
  buttonLabel = 'Continue',
  minLength = 1,
  onSubmit,
  error,
  isSubmitting,
  autoFocus = false,
}) {
  const canSubmit = String(inputValue || '').length >= Math.max(1, Number(minLength) || 1)
  return (
    <div className="auth-root" role="dialog" aria-modal="true">
      <div className="auth-card">
        <div className="auth-avatar">
          {avatarUrl ? (
            <img className="auth-avatar-img" src={avatarUrl} alt="" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M6.5 10h11a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
          )}
        </div>

        <div className="auth-title">{title}</div>
        {subtitle && <div className="auth-subtitle">{subtitle}</div>}

        <div className="auth-form">
          <input
            className="auth-input"
            type="password"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={isSubmitting}
            autoFocus={autoFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSubmit?.()
              }
            }}
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-button" onClick={onSubmit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? 'Checking…' : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
