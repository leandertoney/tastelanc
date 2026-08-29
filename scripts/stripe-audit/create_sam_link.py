#!/usr/bin/env python3
"""Create a no-expiry Stripe Payment Link on the TasteCumberland account for
Caddy Shack (Sam Stambaugh), Restaurant Elite Plan $600 / 6 months + automatic tax.
Reads STRIPE_SECRET_KEY_CUMBERLAND from apps/web/.env.local. Never prints the key."""
import base64, json, os, sys, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
key = ""
for line in open(os.path.join(ROOT, "apps", "web", ".env.local")):
    if line.startswith("STRIPE_SECRET_KEY_CUMBERLAND="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    sys.exit("STRIPE_SECRET_KEY_CUMBERLAND not found")

RESTAURANT_ID = "9d64d846-931a-4e1c-8d35-296b008f728e"
PREV_CUSTOMER = "cus_UBbPOB6WA0RuwZ"
PREV_SUB = "sub_1TDF9qLikRpMKEPPL7QF88tR"
PRICE = "price_1T6vLLQ6n2TWgnjWIYR9OwHK"  # Restaurant Elite Plan, $600 every 6 months
EMAIL = "gm@caddyshackrestaurant.com"

meta = {
    "subscription_type": "restaurant", "business_name": "Caddy Shack",
    "contact_name": "Sam Stambaugh", "email": EMAIL, "phone": "7175857724",
    "restaurant_id": RESTAURANT_ID, "plan": "elite", "duration": "6mo",
    "created_by_admin": "d1b931ce-66ca-40c1-8144-cabf146e006b", "admin_sale": "true",
    "market_slug": "cumberland-pa", "migrated_from_account": "acct_1SZg5wLikRpMKEPP",
    "previous_customer_id": PREV_CUSTOMER, "previous_subscription_id": PREV_SUB,
}
sub_meta = {k: meta[k] for k in ("restaurant_id", "admin_sale", "plan", "duration",
                                 "market_slug", "business_name", "previous_subscription_id")}

params = [
    ("line_items[0][price]", PRICE), ("line_items[0][quantity]", "1"),
    ("automatic_tax[enabled]", "true"), ("billing_address_collection", "required"),
    ("payment_method_types[0]", "card"), ("allow_promotion_codes", "true"),
    ("after_completion[type]", "redirect"),
    ("after_completion[redirect][url]",
     "https://cumberland.tastelanc.com/admin/sales/success?session_id={CHECKOUT_SESSION_ID}"),
]
params += [(f"metadata[{k}]", v) for k, v in meta.items()]
params += [(f"subscription_data[metadata][{k}]", v) for k, v in sub_meta.items()]

req = urllib.request.Request(
    "https://api.stripe.com/v1/payment_links",
    data=urllib.parse.urlencode(params).encode(),
    headers={"Authorization": "Basic " + base64.b64encode((key + ":").encode()).decode()},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        p = json.load(r)
except urllib.error.HTTPError as e:
    sys.exit("Stripe error: " + e.read().decode()[:500])

link = p["url"] + "?prefilled_email=" + urllib.parse.quote(EMAIL)
print("payment link id:", p["id"])
print("send this to Sam:", link)
