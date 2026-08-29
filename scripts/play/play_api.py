import json, time, sys, urllib.request, urllib.parse, jwt
def token(sa_path):
    sa=json.load(open(sa_path)); now=int(time.time())
    assertion=jwt.encode({"iss":sa["client_email"],"scope":"https://www.googleapis.com/auth/androidpublisher","aud":"https://oauth2.googleapis.com/token","iat":now,"exp":now+3600}, sa["private_key"], algorithm="RS256")
    req=urllib.request.Request("https://oauth2.googleapis.com/token", data=urllib.parse.urlencode({"grant_type":"urn:ietf:params:oauth:grant-type:jwt-bearer","assertion":assertion}).encode())
    return json.load(urllib.request.urlopen(req))["access_token"]
def get(tok, path):
    req=urllib.request.Request("https://androidpublisher.googleapis.com/androidpublisher/v3/"+path, headers={"Authorization":"Bearer "+tok})
    try:
        raw=urllib.request.urlopen(req, timeout=60).read().decode()
        return json.loads(raw) if raw.strip() else {}
    except urllib.error.HTTPError as e: return {"error": e.code, "body": e.read().decode()[:300]}
APPS=[("com.tastelanc.app","/Users/leandertoney/tastelanc/apps/mobile/google-service-account.json"),
      ("com.tastelanc.cumberland","/Users/leandertoney/tastelanc/apps/mobile-cumberland/google-service-account.json"),
      ("com.tastelanc.fayetteville","/Users/leandertoney/tastelanc/apps/mobile-fayetteville/google-service-account.json"),
      ("com.pokergpt.app","/Users/leandertoney/pokergpt-app/google-service-account.json"),
      ("com.highlythoughtful.app","/Users/leandertoney/shadow-work/mobile/credentials/play-service-account.json"),
      ("co.courtcrowd","/Users/leandertoney/CourtCrowd-Mobile-App/play-service-account.json")]
if __name__=="__main__":
    for pkg, sa in APPS:
        tok=token(sa); r=get(tok, f"applications/{pkg}/subscriptions")
        if "error" in r: print(f"{pkg}: ERROR {r['error']} {r['body']}"); continue
        subs=r.get("subscriptions",[])
        print(f"{pkg}: {len(subs)} subscription(s)")
        for s in subs:
            plans=[(bp['basePlanId'], bp.get('state'), (bp.get('regionalConfigs') or [{}])[0].get('price',{}).get('units','?')+'.'+str((bp.get('regionalConfigs') or [{}])[0].get('price',{}).get('nanos',0)//10000000).zfill(2) if (bp.get('regionalConfigs') or [{}])[0].get('price') else '?') for bp in s.get("basePlans",[])]
            print("   ", s["productId"], "| plans:", plans)
        iap=get(tok, f"applications/{pkg}/inappproducts")
        if "inappproduct" in iap: print("    one-time products:", [(p['sku'], p.get('status')) for p in iap['inappproduct']])
