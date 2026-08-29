#!/usr/bin/env python3
"""Point Sam's Cumberland payment link at a hosted Stripe confirmation message instead of
the admin success URL (which sends non-admins to a login page). Never prints the key."""
import base64, json, os, sys, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
key = ""
for line in open(os.path.join(ROOT, "apps", "web", ".env.local")):
    if line.startswith("STRIPE_SECRET_KEY_CUMBERLAND="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    sys.exit("STRIPE_SECRET_KEY_CUMBERLAND not found")

LINK = "plink_1U9UdpQ6n2TWgnjWn80BsYIF"
MESSAGE = ("Thanks, Sam! Your Caddy Shack Elite listing on TasteCumberland is set for the next "
           "6 months and will renew automatically. A receipt is on its way to "
           "gm@caddyshackrestaurant.com. Questions? Just reply to the email from The TasteCumberland Team.")

params = [
    ("after_completion[type]", "hosted_confirmation"),
    ("after_completion[hosted_confirmation][custom_message]", MESSAGE),
]
req = urllib.request.Request(
    f"https://api.stripe.com/v1/payment_links/{LINK}",
    data=urllib.parse.urlencode(params).encode(),
    headers={"Authorization": "Basic " + base64.b64encode((key + ":").encode()).decode()},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        p = json.load(r)
except urllib.error.HTTPError as e:
    sys.exit("Stripe error: " + e.read().decode()[:500])
print("updated:", p["id"], "| active:", p["active"], "| after_completion:", p["after_completion"]["type"])
