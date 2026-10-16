# Nexa Network — HTML/CSS/JavaScript starter

A responsive professional networking website with landing page, sign-up/sign-in, member feed, profile editing, people discovery, connection requests, and sample job listings.

## What's included

- `index.html` — page structure and forms
- `styles.css` — responsive styling
- `app.js` — UI logic and Supabase client integration
- `supabase.sql` — database tables, row-level security policies, and new-user profile trigger

## Important: real authentication requires setup

The interface works as a front-end preview without a backend, but real accounts, posts, profiles, and connections require a Supabase project. The app intentionally does not store passwords or pretend that a demo form submission creates an account.

## Setup (Supabase)

1. Create a project at https://supabase.com/.
2. In the Supabase dashboard, open **SQL Editor**, create a query, paste all of `supabase.sql`, and run it.
3. Open **Project Settings → API** (or **Connect**) and copy your Project URL and publishable/anon key. Never use the `service_role` key in browser code.
4. Open `app.js` and replace:
   ```js
   supabaseUrl: "YOUR_SUPABASE_PROJECT_URL",
   supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
   ```
   with the URL and publishable/anon key from your project.
5. In Supabase **Authentication → URL Configuration**, add your local development URL to the allowed redirect URLs. For example, if you use the VS Code Live Server extension, add its local URL, such as `http://127.0.0.1:5500/**`. Add your production website URL before deploying.
6. In **Authentication → Providers → Email**, configure email confirmation to match your needs. For a public production site, keep email confirmation enabled and configure SMTP for reliable delivery.
7. Serve the folder using a local static server. Do not open `index.html` as a `file://` URL:
   - VS Code: install **Live Server**, right-click `index.html`, choose **Open with Live Server**; or
   - Python: run `python -m http.server 8000` from this folder and visit `http://localhost:8000`.
8. Test account creation using an email address you can access. Confirm the email if confirmation is enabled, then sign in.
9. Test editing your profile, publishing a post, searching profiles, and sending a connection request with a second test account.

## Features and current limits

- **Authentication:** Supabase email/password sign-up and sign-in, session persistence, sign-out, and password reset email.
- **Profiles:** Full name, headline, location, about, and skills.
- **Feed:** Read recent posts, publish a post, and delete your own posts.
- **Network:** Browse profiles and send pending connection requests.
- **Jobs:** Searchable sample listings only. Connect a trusted job data source before presenting them as real vacancies.
- **Demo feed/network:** Before Supabase is configured, the public landing page shows sample content. It does not create a real session or store user credentials.
- **Not included yet:** Comments, likes, connection-request acceptance UI, messaging, notifications, uploads/avatars, moderation, reporting, or a production admin dashboard.

## Security notes before launch

- The frontend must use only the Supabase publishable/anon key. Never put a service-role or database password in `app.js`.
- RLS policies are included in `supabase.sql`; do not disable RLS to “fix” access errors.
- This is a starter implementation, not a security audit. Before production, review policies and abuse controls, set up rate limits/monitoring, configure SMTP and domain redirects, add privacy/terms pages, validate content server-side where appropriate, and test with multiple accounts.
- The `connections` table includes recipient-only response policy, but the starter UI does not yet include an accept/decline control. Add that flow before relying on connection status in production.
- Add a comments/likes schema and corresponding RLS policies before enabling those features.
- Job listings are static demo data and must not be treated as real vacancies.
- Consider using a proper production host with HTTPS (e.g. Netlify, Vercel static hosting, or Cloudflare Pages). Configure the final domain in Supabase Auth URL settings.

## Deploying

Upload `index.html`, `styles.css`, and `app.js` to your static host. Run `supabase.sql` once in your project, configure `app.js` with your project URL and publishable key, and set the correct production redirect URL in Supabase. Keep `supabase.sql` in your repository as your database setup reference.

## Troubleshooting

- **“Setup required” message:** `app.js` still has placeholder Supabase settings.
- **Sign-up says to check email:** expected when email confirmation is enabled.
- **Profile or feed cannot load:** ensure the SQL script ran successfully and the signed-in user is authenticated; inspect browser console and Supabase logs.
- **Redirect problems:** make sure the URL shown in the browser is included in Supabase allowed redirect URLs.
- **Email delivery:** default test email services may be limited; configure SMTP for reliable production email.
