export function BottomActionBar({ isVisible, isFavorite, onShare, onDownload, onFavorite }) {
  return (
    <div className={isVisible ? 'mobile-actions' : 'mobile-actions hidden'}>
      <div className="mobile-actions-inner">
        <button className="mobile-action-btn" type="button" onClick={onShare}>Share</button>
        <button className="mobile-action-btn" type="button" onClick={onDownload}>Download</button>
        <button className={isFavorite ? 'mobile-action-btn heart active' : 'mobile-action-btn heart'} type="button" onClick={onFavorite}>
          Favorite
        </button>
      </div>
    </div>
  )
}


