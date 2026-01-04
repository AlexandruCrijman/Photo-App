export function FilterTabs({ value, onChange, myLabel = 'My Photos', allLabel = 'All Photos' }) {
  return (
    <div className="mobile-pill-row">
      <div className="mobile-pill" role="tablist" aria-label="Photo filter">
        <button
          type="button"
          className={value === 'my' ? 'active' : ''}
          onClick={() => onChange('my')}
          role="tab"
          aria-selected={value === 'my'}
        >
          {myLabel}
        </button>
        <button
          type="button"
          className={value === 'all' ? 'active' : ''}
          onClick={() => onChange('all')}
          role="tab"
          aria-selected={value === 'all'}
        >
          {allLabel}
        </button>
      </div>
    </div>
  )
}


