"""Activate every DRAFT base plan for a package so its subscriptions become purchasable.
Usage: play_activate.py <package> <service_account_json>"""
import json, sys, urllib.request
from play_api import token, get

pkg, sa = sys.argv[1], sys.argv[2]
tok = token(sa)
subs = get(tok, f"applications/{pkg}/subscriptions").get("subscriptions", [])
if not subs:
    sys.exit(f"{pkg}: no subscriptions found")
for s in subs:
    for bp in s.get("basePlans", []):
        label = f"{s['productId']}/{bp['basePlanId']}"
        if bp.get("state") == "ACTIVE":
            print(f"{label}: already active"); continue
        req = urllib.request.Request(
            f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{pkg}/subscriptions/{s['productId']}/basePlans/{bp['basePlanId']}:activate",
            data=b"{}", headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"}, method="POST")
        try:
            r = json.load(urllib.request.urlopen(req, timeout=60))
            state = next((b.get("state") for b in r.get("basePlans", []) if b["basePlanId"] == bp["basePlanId"]), "?")
            print(f"{label}: activated -> {state}")
        except urllib.error.HTTPError as e:
            print(f"{label}: ERROR {e.code} {e.read().decode()[:300]}")
