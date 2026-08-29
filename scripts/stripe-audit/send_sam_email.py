#!/usr/bin/env python3
"""Send the Caddy Shack renewal email via Resend as TasteCumberland <hello@tastelanc.com>.
Reads RESEND_API_KEY from apps/web/.env.local. Never prints the key.
Pass --dry-run to print the payload without sending."""
import json, os, sys, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
key = ""
for line in open(os.path.join(ROOT, "apps", "web", ".env.local")):
    if line.startswith("RESEND_API_KEY="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    sys.exit("RESEND_API_KEY not found")

LINK = "https://buy.stripe.com/9B6eVf5N72As00Fatv7ss00?prefilled_email=gm%40caddyshackrestaurant.com"

text = f"""Hi Sam,

Your Caddy Shack Elite listing on TasteCumberland renews on September 21. We are moving your billing onto the TasteCumberland account so everything for your listing lives in one place, and that means we need you to set up payment fresh with this link:

{LINK}

Same plan, same price as before: $600 for 6 months plus PA sales tax, $636 total. Your card will be saved this time so future renewals go through automatically without you having to do anything.

Please use this link before September 21. Once you have paid, your old billing record will be closed out so nothing charges twice.

If anything looks off or you have questions, just reply to this email.

Thanks,
The TasteCumberland Team
"""

html = f"""<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#222;max-width:600px">
<p>Hi Sam,</p>
<p>Your Caddy Shack Elite listing on TasteCumberland renews on September 21. We are moving your billing onto the TasteCumberland account so everything for your listing lives in one place, and that means we need you to set up payment fresh with this link:</p>
<p><a href="{LINK}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">Set up renewal payment</a></p>
<p style="font-size:13px;color:#666">Or copy this link: {LINK}</p>
<p>Same plan, same price as before: $600 for 6 months plus PA sales tax, $636 total. Your card will be saved this time so future renewals go through automatically without you having to do anything.</p>
<p>Please use this link before September 21. Once you have paid, your old billing record will be closed out so nothing charges twice.</p>
<p>If anything looks off or you have questions, just reply to this email.</p>
<p>Thanks,<br>The TasteCumberland Team</p>
</div>"""

payload = {
    "from": "TasteCumberland <hello@tastelanc.com>",
    "to": ["gm@caddyshackrestaurant.com"],
    "reply_to": "hello@tastelanc.com",
    "subject": "Caddy Shack: new payment link for your TasteCumberland Elite renewal",
    "text": text,
    "html": html,
}

# Sep 1, 2026 9:00 AM Eastern (EDT = UTC-4)
SCHEDULED_AT = "2026-09-01T13:00:00Z"

HEADERS = {"Authorization": f"Bearer {key}", "Content-Type": "application/json",
           "User-Agent": "tastelanc-stripe-audit/1.0 (+https://tastelanc.com)"}

def call(path, body=None, method="POST"):
    req = urllib.request.Request("https://api.resend.com" + path,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("Resend error: " + e.read().decode()[:500])

args = sys.argv[1:]
if "--cancel" in args:                      # --cancel <email_id>
    eid = args[args.index("--cancel") + 1]
    print("canceled:", call(f"/emails/{eid}/cancel"))
    sys.exit(0)
if "--status" in args:                      # --status <email_id>
    eid = args[args.index("--status") + 1]
    r = call(f"/emails/{eid}", method="GET")
    print("status:", r.get("last_event"), "| scheduled_at:", r.get("scheduled_at"), "| to:", r.get("to"))
    sys.exit(0)
if "--now" not in args:
    payload["scheduled_at"] = SCHEDULED_AT   # default: schedule for Sep 1
if "--dry-run" in args:
    print(json.dumps({k: v for k, v in payload.items() if k != "html"}, indent=2))
    sys.exit(0)

r = call("/emails", payload)
when = payload.get("scheduled_at", "now")
print(f"queued, resend id: {r.get('id')} | sends at: {when}")
print(f"to cancel before then: python3 {sys.argv[0]} --cancel {r.get('id')}")
