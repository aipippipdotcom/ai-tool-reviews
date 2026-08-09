/** Small shared pieces of the affiliate blocks. Markup mirrors api/_render.js. */

export const Price = ({ price, was }: { price?: string; was?: string }) => {
  if (!price) return null;
  return (
    <span className="aff-price">
      <span className="aff-price__now">{price}</span>
      {was && <span className="aff-price__was">{was}</span>}
    </span>
  );
};

export const Stars = ({ rating }: { rating?: string | number }) => {
  const value = Number(rating);
  if (!Number.isFinite(value) || value <= 0) return null;
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <div className="aff-rating">
      <span className="aff-stars" role="img" aria-label={`${value} out of 5`}>
        <span className="aff-stars__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="aff-rating__score">{value}</span>
      <span className="aff-rating__max">/ 5</span>
    </div>
  );
};
