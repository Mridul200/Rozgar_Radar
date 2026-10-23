import { fetchJobs, fetchFilterOptions } from "@/lib/api";
import { HomePageClient } from "./HomePageClient";
import { JobListing, JobFilterOptions } from "@/types/job";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let initialJobs: JobListing[] = [];
  let initialTotal = 0;
  let initialIndiaCount = 0;
  let initialFilters: JobFilterOptions | null = null;

  try {
    const [jobsRes, filtersRes] = await Promise.all([
      fetchJobs({ india_feed: true, page_size: 6, sort_by: "verified" }),
      fetchFilterOptions().catch(() => null),
    ]);

    if (jobsRes && jobsRes.items && jobsRes.items.length > 0) {
      initialJobs = jobsRes.items;
      initialTotal = jobsRes.total || jobsRes.items.length;
    }
    if (filtersRes) {
      initialFilters = filtersRes;
      initialIndiaCount = filtersRes.india_eligible_count || initialTotal;
    } else {
      initialIndiaCount = initialTotal;
    }
  } catch (err) {
    console.error("SSR failed to fetch live jobs on initial render:", err);
  }

  return (
    <HomePageClient
      initialJobs={initialJobs}
      initialTotal={initialTotal}
      initialIndiaCount={initialIndiaCount}
      initialFilters={initialFilters}
    />
  );
}
