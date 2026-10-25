export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
