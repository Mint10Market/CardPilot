# Card Pilot – Environment Setup Form

Fill in the values below (replace the text in brackets with your real values). When you're done, you can paste the completed form here in chat and we'll create your `.env.local` file from it.

---

## 1. Database

**DATABASE_URL**  
Your PostgreSQL connection string (from Supabase, Neon, or your host).

Example: `postgresql://username:password@host.example.com:5432/cardpilot`

Your value:
```
[ paste your DATABASE_URL here ]
```

---

## 2. eBay (from [eBay Developer Portal](https://developer.ebay.com/))

**EBAY_CLIENT_ID**  
The App ID / Client ID from your eBay app.

Your value:
```
[ paste your EBAY_CLIENT_ID here ]
```

**EBAY_CLIENT_SECRET**  
The Client Secret from your eBay app.

Your value:
```
[ paste your EBAY_CLIENT_SECRET here ]
```

**EBAY_REDIRECT_URI**  
- Local: `http://localhost:3000/api/auth/ebay/callback`  
- Production: `https://card-pilot.vercel.app/api/auth/ebay/callback`

Your value:
```
[ paste your EBAY_REDIRECT_URI here; local: http://localhost:3000/api/auth/ebay/callback | production: https://card-pilot.vercel.app/api/auth/ebay/callback ]
```

**EBAY_ENVIRONMENT**  
Use `sandbox` for testing, `production` when you go live.

Your value:
```
[ sandbox or production ]
```

**EBAY_WEBHOOK_VERIFICATION_TOKEN**  
A secret string you create (32–80 characters, only letters, numbers, underscores, and hyphens). You’ll enter this same value in the eBay Developer Portal when you set up the account-deletion webhook.

Your value:
```
[ your 32–80 character token ]
```

---

## 3. App URL

**NEXT_PUBLIC_APP_URL**  
- Local: `http://localhost:3000`  
- Production: `https://card-pilot.vercel.app`

Your value:
```
[ paste your app URL here; local: http://localhost:3000 | production: https://card-pilot.vercel.app ]
```

---

## 4. Session secret

**SESSION_SECRET**  
Any long random string (at least 32 characters). Used to keep your session secure. You can use a password generator or a long random phrase.

Your value:
```
[ your session secret, at least 32 characters ]
```

---

## Quick copy-paste template

If you prefer to fill one block and paste it back, use this format (replace the placeholder text):

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
EBAY_CLIENT_ID=your_app_id
EBAY_CLIENT_SECRET=your_client_secret
EBAY_REDIRECT_URI=http://localhost:3000/api/auth/ebay/callback
EBAY_ENVIRONMENT=sandbox
EBAY_WEBHOOK_VERIFICATION_TOKEN=your_32_to_80_char_token
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=your_session_secret_at_least_32_chars
# Production: EBAY_REDIRECT_URI=https://card-pilot.vercel.app/api/auth/ebay/callback, NEXT_PUBLIC_APP_URL=https://card-pilot.vercel.app
```

When you're done, paste your filled-out values here in chat (you can redact the secret parts if you prefer and we’ll use placeholders for those), and we’ll create `.env.local` for you.
