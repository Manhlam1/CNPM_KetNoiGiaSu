/** Danh sách đánh giá (hoàn thiện ở M6) */
export function ReviewList({ total }) {
  return <p className="text-ink-soft">{total ? `${total} đánh giá` : 'Chưa có đánh giá nào.'}</p>;
}
