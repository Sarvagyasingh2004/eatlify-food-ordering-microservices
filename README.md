# Eatlify — Food Ordering, Microservices

A Swiggy/Zomato-style food ordering and delivery platform, built as independent
Node.js microservices behind a React frontend. Customers discover nearby
restaurants, order food, and track delivery; sellers manage restaurants and
menus; riders handle pickup and delivery.

## Architecture

```
front-end (React + Vite, :5173)
        │
        ├──> auth service        (:5001)  — login, JWT, roles
        ├──> restaurant service  (:5002)  — restaurants, menu, cart, address
        ├──> order service       (:5004)  — checkout, order lifecycle, payments
        └──> rider service       (:5005)  — delivery assignment & tracking

restaurant / order / rider
        └──> utils service (:5003) — Cloudinary image uploads (internal only)
```

Each backend service is an independent Express + TypeScript app with its own
`package.json`, MongoDB connection, and `.env` — no shared workspace tooling.
Services authenticate with a shared JWT (`JWT_SECRET`) issued by `auth`, and
call `utils` internally for image uploads.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router,
Axios, `@react-oauth/google`, Leaflet / `react-leaflet`, `react-hot-toast`.

**Backend:** Node.js, Express 5, TypeScript, MongoDB + Mongoose (`2dsphere`
geospatial indexes), JWT auth, Multer + Cloudinary.

## Project Structure

```
front-end/                   React SPA (pages, components, context)
services/
├── auth/                    Login, JWT issuance, role assignment
├── restaurant/               Restaurants, menu items, cart, addresses
├── order/                    Checkout, order lifecycle, payments
├── rider/                    Delivery assignment & tracking
└── utils/                    Shared Cloudinary upload service
```

## Features

- Google OAuth login with JWT-based sessions
- Role-based access — `customer` / `seller` / `rider` — enforced via frontend
  route guards and backend middleware (`isAuth`, `isSeller`)
- Sellers manage restaurant profile, open/closed status, and menu items with
  image uploads
- Customers discover nearby restaurants via geospatial (`$geoNear`) search,
  manage delivery addresses on a map, and build a cart scoped to one restaurant
- Orders flow from cart → checkout → payment → rider assignment → delivery,
  with status tracked end-to-end
- Riders receive delivery assignments and update order status in transit

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- A Cloudinary account (image uploads)
- Google OAuth credentials (login)

### Setup & run

Each service is standalone — install, configure, and run individually:

```bash
git clone <your-repo-url>
cd eatlify-food-ordering-microservices

cd services/auth && npm install && cp .env.example .env   # fill in values
npm run dev                                                 # http://localhost:5001

cd ../restaurant && npm install && cp .env.example .env
npm run dev                                                 # http://localhost:5002

cd ../utils && npm install && cp .env.example .env
npm run dev                                                 # http://localhost:5003

cd ../../front-end && npm install
npm run dev                                                 # http://localhost:5173
```

`JWT_SECRET` must be identical across services — tokens are issued by `auth`
and verified everywhere else.

## API Overview

**auth** (`/api/auth`)
| Method | Route       | Description                        |
|--------|-------------|-------------------------------------|
| POST   | `/login`    | Google OAuth login, returns JWT     |
| PUT    | `/add/role` | Set role (customer/seller/rider)    |
| GET    | `/me`       | Fetch authenticated user profile    |

**restaurant** (`/api/restaurant`, `/api/item`, `/api/cart`, `/api/address`)
| Method | Route                     | Description                      |
|--------|---------------------------|-----------------------------------|
| POST   | `/restaurant/add`         | Create restaurant (seller only)   |
| GET    | `/restaurant/my`          | Fetch the logged-in seller's restaurant |
| PUT    | `/restaurant/status`      | Toggle open/closed                |
| PUT    | `/restaurant/edit`        | Update restaurant details         |
| GET    | `/restaurant/all`         | Nearby restaurants (geo search)   |
| GET    | `/restaurant/:id`         | Single restaurant details         |
| POST   | `/item/add`               | Add a menu item (seller only)     |
| GET    | `/item/all/:id`           | List menu items for a restaurant  |
| DELETE | `/item/:itemId`           | Delete a menu item                |
| PUT    | `/item/status/:itemId`    | Toggle item availability          |
| POST   | `/cart/add`               | Add item to cart                  |
| GET    | `/cart/all`               | Fetch current user's cart         |
| PUT    | `/cart/inc` / `/cart/dec` | Increment/decrement item quantity |
| DELETE | `/cart/clear`             | Clear cart                        |
| POST   | `/address/add`            | Save a delivery address            |
| GET    | `/address/all`            | List saved addresses              |
| DELETE | `/address/:id`            | Delete an address                 |

**utils** (`/api`) — internal only, called by other services
| Method | Route     | Description                    |
|--------|-----------|----------------------------------|
| POST   | `/upload` | Upload an image to Cloudinary    |

## License
Not decided yet.
