// lib/strava.ts

export async function fetchStravaActivities(
  accessToken: string,
  lastSyncDate?: string // optional: if provided, only fetch after this
) {
  try {
    // ✅ Default challenge start (1 Oct 2025 midnight IST)
    const challengeStart = new Date("2025-10-01T00:00:00+05:30");

    // ✅ Use lastSyncDate if available, else fall back to challenge start
    const afterDate = lastSyncDate ? new Date(lastSyncDate) : challengeStart;
    const after = Math.floor(afterDate.getTime() / 1000); // convert to Unix seconds

    const activities: any[] = [];
    let page = 1;
    let keepFetching = true;

    while (keepFetching) {
      const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Strava API failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json();

      if (data.length === 0) {
        keepFetching = false;
      } else {
        activities.push(...data);
        page++;
      }
    }

    // ✅ Normalize activities
    return activities.map((a: any) => ({
      strava_id: a.id,
      name: a.name,
      type: a.type,
      distance: a.distance, // in meters
      moving_time: a.moving_time, // in seconds
      start_date: a.start_date,
      strava_url: `https://www.strava.com/activities/${a.id}`,
    }));
  } catch (err) {
    console.error("Error fetching Strava activities:", err);
    return [];
  }
}
