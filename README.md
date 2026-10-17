# Nooha Sleep — React + Node.js

A mobile-friendly Nooha storefront with an Express API, password-protected admin, persistent JSON product catalogue, image uploads, stock availability controls, and an OpenAI-powered product assistant. The reference client's general admin workflow has been adapted to Nooha; no other-client branding or records are included.

## Requirements
- Node.js 20 LTS or newer (Node 18+ should work with built-in `fetch`)
- npm
- Optional: OpenAI API key for live AI responses

## Run locally (two terminals)
1. Extract the ZIP and open the `nooha-sleep` folder in VS Code.
2. Terminal 1:
   ```powershell
   cd client
   npm install
   copy .env.example .env
   npm run dev
   ```
3. Terminal 2:
   ```powershell
   cd server
   npm install
   copy .env.example .env
   # Edit server/.env before using the admin panel; choose a strong ADMIN_PASSWORD and ADMIN_SECRET.
   npm run dev
   ```
4. Open `http://localhost:5173`. API health check: `http://localhost:5000/api/health`.

## Admin panel
- Visit `http://localhost:5173/admin/login`.
- Initial local defaults are username `admin` and password `NoohaChangeMe123!` only when you have not set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `server/.env`. **Change them before use.**
- `ADMIN_SECRET` signs eight-hour admin tokens. Set a long random secret.
- Add/edit product name, category, prices, descriptions, features, images and availability. Product data persists in `server/data/products.json`; uploaded images persist in `server/uploads/`.
- Product edits appear on the storefront after refresh. Back up both data and uploads before moving/deploying the project.

## AI assistant
Set `OPENAI_API_KEY=your_key_here` in `server/.env`. The key is used only by Node.js and is never placed in the browser. `OPENAI_MODEL` defaults to `gpt-4o-mini`. Without a key, the chat widget still works in a limited catalogue/help mode and clearly indicates that live AI is disabled. API usage may incur OpenAI charges.

## Important notes before public launch
- The admin token is an application-level HMAC token; use HTTPS in production, a strong unique `ADMIN_SECRET`, strong admin password, rate limiting, and a proper session/CSRF strategy before public deployment.
- Product storage uses a JSON file to keep local setup simple. For concurrent or multi-server production use, migrate to PostgreSQL or another database.
- Image uploads are restricted to image MIME types and 5 MB, but production should additionally inspect file signatures and use managed object storage.
- Checkout is still a demonstration flow. No real payment, order fulfilment, email delivery or CRM integration is configured. Do not accept live orders until a payment gateway and order backend are implemented and tested.
- Product images currently include illustrative external images. Replace them with approved Nooha product photography.
- Ensure `CLIENT_ORIGIN` is restricted to your production domain when deploying.

## Build frontend
```powershell
cd client
npm install
npm run build
```

## Project structure
- `client/` React/Vite storefront, admin panel, chatbot UI and responsive styling
- `server/server.js` Express API, authentication, uploads and chatbot endpoint
- `server/data/` persistent catalogue created on first run
- `server/uploads/` uploaded product images
