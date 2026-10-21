import sqlite3
import csv
import json
import shutil
import os

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "jobs.db")
DOWNLOADS_DIR = r"C:\Users\mridu\Downloads"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# 1. Export job_listings to CSV
csv_file = os.path.join(DB_DIR, "jobs.csv")
print(f"Exporting job_listings to {csv_file}...")
c.execute("""
    SELECT 
        id,
        title,
        company_name,
        company_domain,
        location_raw,
        city,
        country,
        location_category,
        is_india_eligible,
        work_mode,
        employment_type,
        department,
        salary_min,
        salary_max,
        salary_currency,
        publication_date,
        application_deadline,
        freshness_status,
        is_duplicate,
        application_url,
        source_id
    FROM job_listings
    ORDER BY is_india_eligible DESC, publication_date DESC
""")
rows = c.fetchall()
col_names = [d[0] for d in c.description]

with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(col_names)
    for r in rows:
        writer.writerow([r[k] for k in col_names])

print(f"Exported {len(rows)} rows to {csv_file}")

# 2. Export to JSON
json_file = os.path.join(DB_DIR, "jobs.json")
print(f"Exporting active jobs to {json_file}...")
json_data = []
for r in rows:
    json_data.append(dict(r))

with open(json_file, "w", encoding="utf-8") as f:
    json.dump(json_data, f, indent=2, default=str)

# 3. Optional copy to Downloads folder if exists
if os.path.exists(DOWNLOADS_DIR):
    try:
        print(f"Copying files to {DOWNLOADS_DIR}...")
        shutil.copy2(DB_PATH, os.path.join(DOWNLOADS_DIR, "jobs.db"))
        shutil.copy2(csv_file, os.path.join(DOWNLOADS_DIR, "jobs.csv"))
        shutil.copy2(json_file, os.path.join(DOWNLOADS_DIR, "jobs.json"))
    except Exception as e:
        print(f"Notice: Could not copy to Downloads: {e}")

conn.close()
print("All exports successfully generated!")
