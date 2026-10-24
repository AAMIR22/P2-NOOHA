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

## Store-management updates (October 2026)

This version adds admin tabs for Products, Categories, Customers & Orders, Offers, and Q & A. Product records support the Nooha Signature flag, homepage offer flag, multiple photos, badges, short descriptions, and size options with optional custom prices. Category pages are generated from catalogue categories, and the All Products page groups up to three products under each category with a “See all” link. The footer includes separate policy pages.

### Run locally

1. Install Node.js 20+.
2. In `server/`, run `npm install`, copy `.env.example` to `.env`, set a unique `ADMIN_SECRET` and strong `ADMIN_PASSWORD`, then run `npm start`.
3. In `client/`, run `npm install`, copy `.env.example` to `.env`, set `VITE_API_URL=http://localhost:5000`, then run `npm run dev`.
4. Open the Vite URL and sign in to `/admin` with the credentials configured in the server `.env`.

The project stores catalogue, offer settings, Q&A and order requests in JSON files under `server/data/`. Back up this folder and `server/uploads/` before deployment. Order requests are recorded for follow-up; a payment gateway is not configured. The policy pages included are starter copy and should be reviewed against the business's approved policies before publishing.

### Build note

A production build should be run after installing dependencies in your deployment environment. The uploaded `node_modules` did not contain the platform-specific Vite/Rolldown and TypeScript bindings required to complete a build in this workspace.

## Product visibility, availability and purchase modes

- **Available** controls stock status. Products marked unavailable show an Out of Stock badge and their online purchase controls are disabled.
- **Visible on website** controls public catalogue visibility. Hidden products remain in the admin catalogue but are excluded from public product listings and public product-detail API routes.
- **Online shopping / Enquiry mode** is the product purchase mode. Online shopping requires a price and supports cart/buy actions. Enquiry mode allows the price and compare-at price to be blank and displays an enquiry action instead of cart/checkout controls.
- The previous **Can buy online** checkbox only saved the `onlinePurchase` field; it was not used to govern storefront purchase behavior. It has been replaced by the explicit mode toggle. Existing records are migrated compatibly: `onlinePurchase: false` is treated as Enquiry mode unless an explicit `enquiryMode` value exists.
- The new toggle settings are saved with the product record through the admin API. Public API endpoints filter hidden products; admin endpoints continue to show all products.

Before deployment, install dependencies in `client` and `server`, run the frontend production build, and test the admin save flow and storefront in a browser.
