import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  category: string; // Adjusted name from 'section' to 'category' for consistency
}

const Pagination = ({ currentPage, totalPages, category }: PaginationProps) => {
  // Determine previous and next page numbers
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      aria-label="Pagination"
      className="flex justify-center items-center space-x-6 mt-10"
    >
      {/* Previous Page Link */}
      {prevPage ? (
        <Link
          href={`/insights/${category}${prevPage > 1 ? `?page=${prevPage}` : ""}`}
          className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white transition"
          aria-label={`Go to page ${prevPage}`}
        >
          Previous
        </Link>
      ) : (
        <span
          className="px-4 py-2 rounded bg-gray-800 text-gray-500 cursor-not-allowed"
          aria-disabled="true"
        >
          Previous
        </span>
      )}

      {/* Current Page Indicator */}
      <span className="text-gray-300">
        Page <span className="font-semibold">{currentPage}</span> of{" "}
        <span className="font-semibold">{totalPages}</span>
      </span>

      {/* Next Page Link */}
      {nextPage ? (
        <Link
          href={`/insights/${category}?page=${nextPage}`}
          className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white transition"
          aria-label={`Go to page ${nextPage}`}
        >
          Next
        </Link>
      ) : (
        <span
          className="px-4 py-2 rounded bg-gray-800 text-gray-500 cursor-not-allowed"
          aria-disabled="true"
        >
          Next
        </span>
      )}
    </nav>
  );
};

export default Pagination;
