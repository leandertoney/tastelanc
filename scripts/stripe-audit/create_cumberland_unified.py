#!/usr/bin/env python3
"""Create the Unified plan (product + 3 prices) in the TasteCumberland Stripe account,
mirroring the TasteLanc account's Unified prices ($99/mo, $899/yr, $1,798/2yr).
Idempotent: reuses an existing 'TasteCumberland Premium - Unified' product and any
price that already matches amount + interval. Never prints the key."""
import base64, json, os, sys, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
key = ""
for line in open(os.path.join(ROOT, "apps", "web", ".env.local")):
    if line.startswith("STRIPE_SECRET_KEY_CUMBERLAND="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    sys.exit("STRIPE_SECRET_KEY_CUMBERLAND not found")
AUTH = {"Authorization": "Basic " + base64.b64encode((key + ":").encode()).decode()}

def call(path, params=None, method="GET"):
    url = "https://api.stripe.com/v1/" + path
    data = urllib.parse.urlencode(params).encode() if params is not None else None
    if method == "GET" and params:
        url += "?" + urllib.parse.urlencode(params); data = None
    req = urllib.request.Request(url, data=data, headers=AUTH, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Stripe error on {path}: {e.read().decode()[:400]}")

NAME = "TasteCumberland Premium - Unified"
prods = [p for p in call("products", {"limit": 100, "active": "true"})["data"] if p["name"] == NAME]
if prods:
    product = prods[0]; print("product exists:", product["id"])
else:
    product = call("products", [
        ("name", NAME),
        ("description", "Complete platform access with all Elite features - unified plan for TasteCumberland restaurants"),
        ("metadata[tier]", "unified"), ("metadata[market]", "cumberland-pa"),
    ], "POST"); print("product created:", product["id"])

wanted = [
    ("monthly", 9900, "month", 1, {"billing_period": "monthly", "tier": "unified", "plan": "unified", "duration": "monthly"}),
    ("yearly", 89900, "year", 1, {"billing_period": "yearly", "tier": "unified", "plan": "unified", "duration": "yearly", "savings": "$289 vs monthly"}),
    ("2year", 179800, "year", 2, {"billing_period": "2year", "tier": "unified", "plan": "unified", "duration": "2year"}),
]
existing = call("prices", {"product": product["id"], "limit": 100, "active": "true"})["data"]
out = {}
for k, amt, interval, count, meta in wanted:
    match = next((p for p in existing if p["unit_amount"] == amt and p["recurring"]["interval"] == interval and p["recurring"]["interval_count"] == count), None)
    if match:
        out[k] = match["id"]; print(f"{k}: exists {match['id']}"); continue
    params = [("product", product["id"]), ("currency", "usd"), ("unit_amount", str(amt)),
              ("recurring[interval]", interval), ("recurring[interval_count]", str(count)),
              ("lookup_key", f"cumberland_unified_{k}")]
    params += [(f"metadata[{mk}]", mv) for mk, mv in meta.items()]
    p = call("prices", params, "POST"); out[k] = p["id"]; print(f"{k}: created {p['id']}")

print("\nSet these on Netlify (all 3 sites) and in apps/web/.env.local:")
print(f"STRIPE_PRICE_UNIFIED_MONTHLY_CUMBERLAND={out['monthly']}")
print(f"STRIPE_PRICE_UNIFIED_YEARLY_CUMBERLAND={out['yearly']}")
print(f"STRIPE_PRICE_UNIFIED_2YEAR_CUMBERLAND={out['2year']}")
