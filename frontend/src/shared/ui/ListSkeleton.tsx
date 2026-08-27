const skeletonItems = [0, 1, 2]

export function ListSkeleton({ label }: { label: string }) {
  return <div className="list-skeleton" role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    {skeletonItems.map((item) => <span className="list-skeleton-card" aria-hidden="true" key={item}>
      <span />
      <span />
    </span>)}
  </div>
}
