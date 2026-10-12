/*
 * Library Health card configuration. Every card opens the shared
 * movie-list overlay (stats-movie-list.js) with the movies behind its
 * count -- the same minimal-detail rows as the analytics slices.
 */
export const LIBRARY_ISSUE_CONFIG = Object.freeze({
    'missing-files': Object.freeze({
        cardId: 'missing-files-card',
        metricId: 'missing-files',
        countField: 'missing_files',
        title: 'Missing Files',
        emptyMessage: 'No movies with missing files were found.'
    }),
    'missing-posters': Object.freeze({
        cardId: 'missing-posters-card',
        metricId: 'missing-posters',
        countField: 'missing_posters',
        title: 'Missing Posters',
        emptyMessage: 'No movies with missing posters were found.'
    }),
    'incomplete-metadata': Object.freeze({
        cardId: 'incomplete-metadata-card',
        metricId: 'incomplete-metadata',
        countField: 'incomplete_metadata',
        title: 'Incomplete Metadata',
        emptyMessage: 'No movies with incomplete metadata were found.'
    })
});
