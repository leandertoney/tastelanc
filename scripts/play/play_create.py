"""Create Play subscriptions as DRAFTS (not activated), mirroring the iOS products and US prices.
Usage: play_create.py <package> <service_account_json> <brand>
  e.g. play_create.py com.tastelanc.app apps/mobile/google-service-account.json TasteLanc
Run play_activate.py afterwards to make them purchasable."""
import json, sys, urllib.request
from play_api import token

pkg, sa, brand = sys.argv[1], sys.argv[2], sys.argv[3]
tok = token(sa)

def call(path, body):
    req = urllib.request.Request(
        "https://androidpublisher.googleapis.com/androidpublisher/v3/" + path,
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"}, method="POST")
    try:
        return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:400]}

def money(usd, currency="USD"):
    units = int(usd)
    return {"currencyCode": currency, "units": str(units), "nanos": int(round((usd - units) * 1e9))}

def base_plan(plan_id, period, usd):
    return {
        "basePlanId": plan_id,
        "regionalConfigs": [{"regionCode": "US", "newSubscriberAvailability": True, "price": money(usd)}],
        "otherRegionsConfig": {"usdPrice": money(usd), "eurPrice": money(usd, "EUR"), "newSubscriberAvailability": True},
        "autoRenewingBasePlan": {
            "billingPeriodDuration": period, "gracePeriodDuration": "P7D",
            "resubscribeState": "RESUBSCRIBE_STATE_ACTIVE",
            "prorationMode": "SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE",
            "legacyCompatible": True,
        },
    }

# Product ids must match the iOS ids exactly; RevenueCat maps stores by product id.
PRODUCTS = {
    "com.tastelanc.app": [
        ("tastelanc_monthly_v2",      "monthly", "P1M", 4.99,  "TasteLanc+ Monthly"),
        ("tastelanc_annual_discount", "annual",  "P1Y", 14.99, "TasteLanc+ Annual (intro price)"),
        ("tastelanc_annual_v2",       "annual",  "P1Y", 24.99, "TasteLanc+ Annual"),
    ],
    "com.tastelanc.cumberland": [
        ("tastecumberland_monthly",         "monthly", "P1M", 4.99,  "TasteCumberland+ Monthly"),
        ("tastecumberland_annual_discount", "annual",  "P1Y", 14.99, "TasteCumberland+ Annual (intro price)"),
        ("tastecumberland_annual",          "annual",  "P1Y", 24.99, "TasteCumberland+ Annual"),
    ],
}
if pkg not in PRODUCTS:
    sys.exit(f"no product map for {pkg}")

for product_id, plan_id, period, usd, title in PRODUCTS[pkg]:
    body = {
        "packageName": pkg, "productId": product_id,
        "basePlans": [base_plan(plan_id, period, usd)],
        "listings": [{"languageCode": "en-US", "title": title[:55],
                      "benefits": ["Premium deals and happy hours", "Early access to events", "Support local dining"],
                      "description": f"{brand}+ unlocks every premium feature."}],
    }
    r = call(f"applications/{pkg}/subscriptions?regionsVersion.version=2022/02", body)
    if "error" in r:
        print(f"{product_id}: ERROR {r['error']} {r['body']}")
    else:
        print(f"{product_id}: created (draft) base plan {plan_id} ${usd} state={r['basePlans'][0].get('state')}")
