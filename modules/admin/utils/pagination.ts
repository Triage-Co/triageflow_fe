export type CompactPageItem = number | 'ellipsis';

export function getCompactPages(currentPage: number, totalPages: number): CompactPageItem[] {
    if (totalPages <= 6) {
        return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    if (currentPage <= 2) {
        return [1, 2, 3, 'ellipsis', totalPages - 1, totalPages];
    }

    if (currentPage === 3) {
        return [1, 2, 3, 4, 'ellipsis', totalPages - 1, totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage, currentPage + 1, 'ellipsis', totalPages - 1, totalPages];
}