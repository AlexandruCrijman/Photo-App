export function BottomActionBar({ isVisible, isFavorite, onShare, onDownload, onFavorite }) {
  const IconShare = ({ size = 22 }) => (
    <svg className="mobile-action-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 5l-8 7 8 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(24,0) scale(-1,1)"
      />
      <path
        d="M8 12h9a4 4 0 0 1 4 4v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  const IconDownload = ({ size = 22 }) => (
    <svg className="mobile-action-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )

  const IconHeart = ({ size = 22, filled = false }) => (
    <svg className="mobile-action-icon" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path
        d="M12.1 21.35l-1.1-1.02C5.14 14.98 2 12.08 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.58-3.14 6.48-8.9 11.83l-1 .92Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )

  return (
    <div className={isVisible ? 'mobile-actions' : 'mobile-actions hidden'}>
      <div className="mobile-actions-inner">
        <button className="mobile-action-btn" type="button" onClick={onShare}>
          <IconShare />
          <span className="mobile-action-label">Share</span>
        </button>
        <button className="mobile-action-btn" type="button" onClick={onDownload}>
          <IconDownload />
          <span className="mobile-action-label">Download</span>
        </button>
        <button className={isFavorite ? 'mobile-action-btn heart active' : 'mobile-action-btn heart'} type="button" onClick={onFavorite}>
          <IconHeart filled={isFavorite} />
          <span className="mobile-action-label">Favorite</span>
        </button>
      </div>
    </div>
  )
}


