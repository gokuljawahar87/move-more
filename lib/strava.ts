// lib/strava.ts
export async function fetchStravaActivities(access_token: string) {
  try {
    const res = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=50", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Strava API error: ${res.status} ${res.statusText}`);
    }

    const activities = await res.json();

    return activities.map((a: any) => ({
      strava_id: a.id, // 👈 important for deduplication
      name: a.name,
      type: a.type,
      distance: a.distance,
      moving_time: a.moving_time,
      start_date: a.start_date,
      strava_url: `https://www.strava.com/activities/${a.id}`,
    }));
  } catch (err: any) {
    console.error("Failed to fetch Strava activities:", err);
    return [];
  }
}
