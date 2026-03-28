# Eventrova

Eventrova is a smart event planning app built with React, Vite, Express, Gemini, and Yelp.

## Why the Yelp connection error happens

In this project, the frontend checks Yelp through these backend routes:

- `GET /api/yelp/test`
- `GET /api/yelp/search`

That means **the Express server must be running**, and the server must have `YELP_API_KEY` available in its runtime environment.

The two most common causes of the error are:

1. `YELP_API_KEY` is missing in the server environment.
2. The site is deployed as static hosting only, so the `/api/*` Express routes are not running.

## Fix included in this package

This package now loads environment variables for the Node server using `dotenv`, so local `.env.local` and `.env` setups work properly.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_key
   YELP_API_KEY=your_yelp_api_key
   PORT=3000
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open:
   ```
   http://localhost:3000
   ```
5. Test backend routes directly in your browser:
   - `/api/debug`
   - `/api/yelp/test`

## Important deployment note

If you deploy only the Vite frontend to a static host/CDN, Yelp will fail because there is no Node backend to serve `/api/yelp/test` and `/api/yelp/search`.

For production, deploy the whole app to a platform that runs Node/Express, such as:

- Render
- Railway
- Fly.io
- a VPS/EC2 server
- any platform with Node server support

Then set these server environment variables in the deployment dashboard:

- `YELP_API_KEY`
- `GEMINI_API_KEY`
- `PORT` (optional)

## Backend routes

- `GET /api/health`
- `GET /api/debug`
- `GET /api/yelp/test`
- `GET /api/yelp/search`
- `POST /api/yelp/search`


## Render deployment

This repo now includes a `render.yaml` Blueprint so you can deploy it as a single Node web service.

### Steps

1. Push this project to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. If you create the service manually, use:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add environment variables in Render:
   - `YELP_API_KEY`
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
5. After deploy, test:
   - `/api/health`
   - `/api/debug`
   - `/api/yelp/test`

## Railway deployment

This repo now includes a `railway.toml` config file.

### Steps

1. Push this project to GitHub.
2. In Railway, create a new project from the repo.
3. Railway should detect it as a Node app automatically.
4. Add environment variables in Railway:
   - `YELP_API_KEY`
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
5. Generate a public domain in Railway Networking.
6. Test:
   - `/api/health`
   - `/api/debug`
   - `/api/yelp/test`

## Notes

- The app serves the built Vite frontend from `dist/` in production.
- The backend and frontend stay on the same domain, so `/api/*` routes work without extra CORS setup.
- Do not put the Yelp key in frontend code or Vite `VITE_*` variables.
