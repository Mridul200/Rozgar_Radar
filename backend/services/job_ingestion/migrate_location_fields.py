"""
Migration & Backfill Script for Location Filtering & Classification.

Adds location_category, is_india_eligible, and location_eligibility_reason columns to job_listings table
and classifies all existing stored listings according to the ingestion rules.
"""
import sys
import os
import sqlite3
import logging

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from services.job_ingestion.location_filter import LocationClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

def migrate_database(db_path: str = None):
    if not db_path:
        db_path = os.path.join(root_dir, "jobs.db")
    
    logger.info(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Inspect current columns
    cursor.execute("PRAGMA table_info(job_listings)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    logger.info(f"Existing columns in job_listings: {len(existing_cols)}")

    # Add missing columns
    if "location_category" not in existing_cols:
        logger.info("Adding column 'location_category'...")
        cursor.execute("ALTER TABLE job_listings ADD COLUMN location_category VARCHAR(32) DEFAULT 'international_only'")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_job_listings_location_category ON job_listings (location_category)")

    if "is_india_eligible" not in existing_cols:
        logger.info("Adding column 'is_india_eligible'...")
        cursor.execute("ALTER TABLE job_listings ADD COLUMN is_india_eligible BOOLEAN DEFAULT 0 NOT NULL")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_job_listings_is_india_eligible ON job_listings (is_india_eligible)")

    if "location_eligibility_reason" not in existing_cols:
        logger.info("Adding column 'location_eligibility_reason'...")
        cursor.execute("ALTER TABLE job_listings ADD COLUMN location_eligibility_reason VARCHAR(256)")

    conn.commit()

    # Backfill classification for all existing listings
    cursor.execute("SELECT id, title, location_raw, city, country, work_mode, description_plain FROM job_listings")
    rows = cursor.fetchall()
    logger.info(f"Classifying {len(rows)} listings...")

    counts = {
        "india_office": 0,
        "remote_india": 0,
        "apac_worldwide": 0,
        "international_only": 0,
    }

    updates = []
    for r in rows:
        job_id, title, loc_raw, city, country, work_mode, desc = r
        res = LocationClassifier.classify(
            title=title,
            location_raw=loc_raw,
            city=city,
            country=country,
            work_mode=work_mode,
            description=desc
        )
        counts[res.category] = counts.get(res.category, 0) + 1
        updates.append((res.category, 1 if res.is_india_eligible else 0, res.reason, job_id))

    cursor.executemany(
        """
        UPDATE job_listings
        SET location_category = ?,
            is_india_eligible = ?,
            location_eligibility_reason = ?
        WHERE id = ?
        """,
        updates
    )
    conn.commit()
    conn.close()

    logger.info("=== Migration & Backfill Completed Successfully ===")
    for cat, count in counts.items():
        logger.info(f" - {cat:20}: {count} jobs")
    logger.info(f"Total India Eligible: {counts['india_office'] + counts['remote_india'] + counts['apac_worldwide']} jobs")

if __name__ == "__main__":
    migrate_database()
