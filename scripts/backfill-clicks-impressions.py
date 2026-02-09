#!/usr/bin/env python3
"""
Backfill clicks and impressions (fixing the issues from first run).
- Clicks: Higher base rate
- Impressions: Use unique anonymous IDs to avoid dedup constraint
"""

import json
import random
import uuid
import sys
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SB_URL = "https://kufcxxynjvyharhtfptd.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY"
HEADERS = {
    "apikey": SB_KEY,
    "Authorization": f"Bearer {SB_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

BACKFILL_DAYS = 60
NOW = datetime(2026, 2, 8, 12, 0, 0, tzinfo=timezone.utc)
START_DATE = NOW - timedelta(days=BACKFILL_DAYS)

CLICK_TYPES = ["phone", "website", "directions", "share", "favorite", "happy_hour", "event", "menu"]
CLICK_WEIGHTS = [25, 20, 25, 5, 8, 7, 5, 5]

SECTIONS = ["featured", "happy_hours", "other_places", "entertainment", "events",
            "search", "category", "specials_view_all", "happy_hours_view_all"]


def sb_get(path):
    req = Request(f"{SB_URL}/rest/v1/{path}", headers=HEADERS)
    with urlopen(req) as resp:
        return json.loads(resp.read())


def sb_post(table, rows):
    BATCH = 500
    inserted = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        data = json.dumps(batch).encode()
        req = Request(f"{SB_URL}/rest/v1/{table}", data=data, headers=HEADERS, method="POST")
        try:
            with urlopen(req) as resp:
                inserted += len(batch)
        except HTTPError as e:
            body = e.read().decode()
            print(f"  ERROR batch {i//BATCH}: {body[:150]}")
        if (i // BATCH) % 20 == 0 and i > 0:
            pct = round(i / len(rows) * 100)
            print(f"    ...{pct}% ({i}/{len(rows)})")
    return inserted


def random_time_in_day(day_date):
    if random.random() < 0.8:
        hour = random.randint(10, 22)
    else:
        hour = random.randint(0, 23)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return day_date.replace(hour=hour, minute=minute, second=second).isoformat()


def generate_visitor_id(user_ids):
    """Generate unique visitor IDs - use real users or unique anonymous IDs."""
    if random.random() < 0.35 and user_ids:
        return random.choice(user_ids)
    # Generate unique anonymous ID (simulates different devices)
    return f"anon-{uuid.uuid4().hex[:12]}"


def main():
    print("=== Backfill Clicks & Impressions ===\n")

    # Fetch data
    print("Fetching restaurants...")
    restaurants = sb_get("restaurants?select=id,name,average_rating,tier_id&is_active=eq.true&limit=500")
    restaurant_ids = [r["id"] for r in restaurants]
    print(f"  {len(restaurants)} active restaurants")

    hh_data = sb_get("happy_hours?select=restaurant_id&is_active=eq.true")
    event_data = sb_get("events?select=restaurant_id&is_active=eq.true")
    has_hh = set(r["restaurant_id"] for r in hh_data)
    has_events = set(r["restaurant_id"] for r in event_data)

    auth_resp = json.loads(urlopen(Request(
        f"{SB_URL}/auth/v1/admin/users?per_page=50&page=1", headers=HEADERS
    )).read())
    user_ids = [u["id"] for u in auth_resp.get("users", [])]

    # Popularity scores (same logic as main script)
    popularity = {}
    for r in restaurants:
        rid = r["id"]
        score = random.uniform(1, 3)
        if rid in has_hh: score += 1.5
        if rid in has_events: score += 2.0
        if r.get("average_rating"): score += (r["average_rating"] - 3.0) * 0.5
        if r.get("tier_id") == "00000000-0000-0000-0000-000000000002": score += 1.5
        popularity[rid] = max(score, 0.5)
    max_pop = max(popularity.values())
    for rid in popularity:
        popularity[rid] = popularity[rid] / max_pop

    # === CLICKS ===
    print("\nGenerating clicks...")
    clicks = []

    for day_offset in range(BACKFILL_DAYS):
        day_date = START_DATE + timedelta(days=day_offset)
        day_of_week = day_date.weekday()
        weekend_mult = 1.3 if day_of_week >= 4 else 1.0
        growth_mult = 0.5 + 0.5 * (day_offset / BACKFILL_DAYS)
        daily_noise = random.uniform(0.7, 1.3)

        for r in restaurants:
            rid = r["id"]
            pop = popularity[rid]

            # ~12% of views → clicks. Views avg ~1-8/day, so clicks ~0.1-1.0/day
            base_clicks = pop * 1.2 * weekend_mult * growth_mult * daily_noise
            num_clicks = int(random.expovariate(1.0 / max(base_clicks, 0.1)))
            num_clicks = min(num_clicks, 8)  # cap

            for _ in range(num_clicks):
                click_type = random.choices(CLICK_TYPES, weights=CLICK_WEIGHTS, k=1)[0]
                visitor = generate_visitor_id(user_ids)
                ts = random_time_in_day(day_date)

                clicks.append({
                    "click_type": click_type,
                    "restaurant_id": rid,
                    "visitor_id": visitor,
                    "clicked_at": ts,
                })

    print(f"  Generated {len(clicks)} clicks")
    print("  Inserting...")
    inserted = sb_post("analytics_clicks", clicks)
    print(f"  Inserted {inserted} clicks")

    # === SECTION IMPRESSIONS ===
    print("\nGenerating section impressions (last 7 days)...")
    impressions = []
    seen_keys = set()  # track (restaurant_id, section_name, visitor_id, epoch_seed)

    for day_offset in range(7):
        day_date = NOW - timedelta(days=6 - day_offset)

        # 16 epochs per day (30-min intervals from 8am to midnight)
        for epoch_hr in range(8, 24):
            for epoch_half in [0, 1]:
                epoch_time = day_date.replace(hour=epoch_hr, minute=epoch_half * 30, second=0)
                epoch_seed = int(epoch_time.timestamp()) // 1800

                # Each section shows a subset of restaurants
                for section in SECTIONS:
                    num_shown = random.randint(15, 40)
                    shown_restaurants = random.sample(restaurant_ids, min(num_shown, len(restaurant_ids)))

                    for position, rid in enumerate(shown_restaurants):
                        # 1-4 unique viewers per restaurant per epoch
                        num_viewers = random.randint(1, 4)
                        for _ in range(num_viewers):
                            visitor = generate_visitor_id(user_ids)
                            key = (rid, section, visitor, epoch_seed)

                            if key in seen_keys:
                                continue
                            seen_keys.add(key)

                            ts = epoch_time.replace(
                                minute=epoch_half * 30 + random.randint(0, 29),
                                second=random.randint(0, 59)
                            ).isoformat()

                            impressions.append({
                                "restaurant_id": rid,
                                "section_name": section,
                                "position_index": position,
                                "visitor_id": visitor,
                                "epoch_seed": epoch_seed,
                                "impressed_at": ts,
                            })

        print(f"  Day {day_offset + 1}/7: {len(impressions)} total impressions so far")

    # Cap at a reasonable size to avoid timeout
    if len(impressions) > 200000:
        print(f"  Sampling down from {len(impressions)} to 200000")
        impressions = random.sample(impressions, 200000)

    print(f"  Total: {len(impressions)} impressions")
    print("  Inserting...")
    inserted = sb_post("section_impressions", impressions)
    print(f"  Inserted {inserted} impressions")

    print("\n=== Done ===")
    print(f"  Clicks: {len(clicks)}")
    print(f"  Impressions: {inserted}")


if __name__ == "__main__":
    main()
