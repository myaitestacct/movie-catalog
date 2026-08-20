export const LIBRARY_ISSUE_CONFIG = Object.freeze({
    'missing-files': Object.freeze({
        cardId: 'missing-files-card',
        countField: 'missing_files',
        title: 'Missing Files',
        emptyMessage: 'No movies with missing files were found.',
        paginationLabel: 'Missing files pagination'
    }),
    'missing-posters': Object.freeze({
        cardId: 'missing-posters-card',
        countField: 'missing_posters',
        title: 'Missing Posters',
        emptyMessage: 'No movies with missing posters were found.',
        paginationLabel: 'Missing posters pagination'
    }),
    'incomplete-metadata': Object.freeze({
        cardId: 'incomplete-metadata-card',
        countField: 'incomplete_metadata',
        title: 'Incomplete Metadata',
        emptyMessage: 'No movies with incomplete metadata were found.',
        paginationLabel: 'Incomplete metadata pagination'
    })
});

export function groupMovieRows(rows) {
    const groups = new Map();

    rows.forEach(row => {
        const originalTitle = String(row.ORIGINALTITLE ?? '').trim();
        const formattedTitle = String(row.FORMATTEDTITLE ?? '').trim();
        const title = originalTitle ||
            formattedTitle ||
            `Movie #${row.NUM ?? ''}`;
        const year = String(row.YEAR ?? '');
        const url = String(row.URL ?? '');
        const key = JSON.stringify([title, year, url]);

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                title,
                year,
                url,
                count: 0,
                rows: [],
                open: false
            });
        }

        const group = groups.get(key);
        group.rows.push(row);
        group.count = group.rows.length;
    });

    return Array.from(groups.values());
}

export function countGroupedRows(groups) {
    return groups.reduce(
        (total, group) => total + group.rows.length,
        0
    );
}
