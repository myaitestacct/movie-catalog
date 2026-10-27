-- Reference schema for a NEW, disposable local database only.
-- This is not a migration for an existing catalog. CREATE intentionally fails
-- if a movies table already exists; no existing data is dropped or replaced.
CREATE TABLE movies (
    NUM INT UNSIGNED NOT NULL PRIMARY KEY,
    FORMATTEDTITLE VARCHAR(512) NULL,
    ORIGINALTITLE VARCHAR(512) NULL,
    TRANSLATEDTITLE VARCHAR(512) NULL,
    YEAR SMALLINT UNSIGNED NULL,
    LENGTH SMALLINT UNSIGNED NULL,
    CERTIFICATION VARCHAR(255) NULL,
    RATING DECIMAL(3, 1) NULL,
    DIRECTOR TEXT NULL,
    ACTORS TEXT NULL,
    COUNTRY TEXT NULL,
    DESCRIPTION TEXT NULL,
    -- Stored in MiB, not bytes. Analytics multiply by 1048576.
    FILESIZE DECIMAL(14, 2) NULL,
    LANGUAGES TEXT NULL,
    CATEGORY TEXT NULL,
    RESOLUTION VARCHAR(255) NULL,
    AUDIOFORMAT VARCHAR(255) NULL,
    FILEPATH TEXT NULL,
    SUBTITLES TEXT NULL,
    URL VARCHAR(2048) NULL,
    PICTURENAME VARCHAR(512) NULL,
    KEY movie_year (YEAR),
    KEY movie_title (FORMATTEDTITLE(191)),
    KEY movie_url (URL(191)),
    FULLTEXT KEY movie_search (FORMATTEDTITLE, ORIGINALTITLE, TRANSLATEDTITLE, DIRECTOR, ACTORS, CATEGORY, DESCRIPTION)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hidden archive collection (optional). The `paripakva` table is reachable
-- only through the `archive=1` API flag, toggled in the UI with Ctrl+Shift+K.
-- It must expose the same columns as `movies`; create it with the same shape,
-- for example:
--
-- CREATE TABLE paripakva LIKE movies;
-- -- then load the archived rows into paripakva.
--
-- The application never migrates or copies data between the two tables, and
-- only the whitelisted names `movies` and `paripakva` can ever be queried
-- (see src/helpers/MovieTable.php).
