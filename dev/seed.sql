-- Fictional development fixtures, not a real media library. Load once after
-- schema.sql in a NEW database. No media files or poster images are included.
INSERT INTO movies
    (NUM, FORMATTEDTITLE, ORIGINALTITLE, YEAR, LENGTH, RATING, FILESIZE, FILEPATH)
VALUES
    (1, 'Absent Reel', 'Absent Reel', 2001, 100, 7.1, 700, 'MISSING'),
    (2, 'Missing Pieces', 'Missing Pieces', 2002, 110, 7.2, 1024, '/archive/Missing.Pieces.mkv'),
    (3, 'Mission Spring', 'Mission Spring', 2003, 120, 7.3, 1536,
        CONCAT('D:', CHAR(92), 'Movies', CHAR(92), 'Mission.Spring.mkv')),
    (4, 'Ordinary Movie', 'Ordinary Movie', 2004, 90, 7.4, 2048, '/archive/missing/ordinary.mkv'),
    (5, 'Special Characters', 'Special Characters', 2005, 95, 7.5, 3072, '/archive/100%_=.mkv'),
    (6, 'Replacement Candidate', 'Replacement Candidate', 2006, 105, 7.6, 6144, '/archive/replacement-Get.Better.Copy.mkv'),
    (7, 'Uncatalogued File', 'Uncatalogued File', 0, 0, 0, 0, NULL),
    (8, 'Missing Pieces Extended', 'Missing Pieces Extended', 2007, 140, 7.8, 2560,
        CONCAT('D:', CHAR(92), 'Movies', CHAR(92), 'Missing.Pieces.Extended.mkv'));
