#!/usr/bin/env python3
"""Read-only Stripe pull for the TasteLanc account. Never prints the key. GET requests only."""
import base64, json, os, sys, urllib.request, urllib.parse, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

def load_env(path):
    out = {}
    if not os.path.exists(path): return out
    for line in open(path):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out

env = load_env(os.path.join(HERE, ".env"))
key = env.get("STRIPE_RESTRICTED_KEY") or ""
key_source = "restricted"
if not key:
    key = load_env(os.path.join(ROOT, "apps", "web", ".env.local")).get("STRIPE_SECRET_KEY", "")
    key_source = "fallback apps/web/.env.local STRIPE_SECRET_KEY"
if not key:
    sys.exit("no key found")
AUTH = "Basic " + base64.b64encode((key + ":").encode()).decode()

def get(path, **params):
    q = []
    for k, v in params.items():
        if isinstance(v, list):
            for x in v: q.append((k + "[]", x))
        else: q.append((k, v))
    url = "https://api.stripe.com/v1/" + path + ("?" + urllib.parse.urlencode(q) if q else "")
    req = urllib.request.Request(url, headers={"Authorization": AUTH})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            if e.code == 429 and attempt < 4: time.sleep(2 ** attempt); continue
            raise SystemExit(f"HTTP {e.code} on {path}: {body[:300]}")

def list_all(path, **params):
    items, after = [], None
    while True:
        p = dict(params, limit=100)
        if after: p["starting_after"] = after
        page = get(path, **p)
        items.extend(page["data"])
        if not page.get("has_more"): break
        after = page["data"][-1]["id"]
    return items

out = {"key_source": key_source, "account": get("account")["id"]}
out["charges"] = list_all("charges", expand=["data.customer"])
out["disputes"] = list_all("disputes")
out["subscriptions"] = list_all("subscriptions", status="all", expand=["data.customer", "data.latest_invoice"])
out["invoices"] = list_all("invoices")
out["prices"] = list_all("prices", expand=["data.product"])
out["customers"] = list_all("customers")
json.dump(out, open(os.path.join(HERE, "data.json"), "w"))
print("key_source:", key_source, "| account:", out["account"])
for k in ("charges", "disputes", "subscriptions", "invoices", "prices", "customers"):
    print(k, len(out[k]))
