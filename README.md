# HotSpotter

HotSpotter is a university project for discovering and managing events and spots.

## 🌐 Deployment

Live app: https://hot-spotter.vercel.app/

## 🧰 Local setup (Instructor)

You can run the project locally with Docker (for Postgres), Node.js, and Python.

1. **Backend setup**: follow `server/README.md`
2. **Frontend setup**: follow `client/README.md`

> The server and client READMEs include environment variables, database setup, and run commands.

## ✅ What you can do in the app

### Without login
- Browse events and spots
- View event details and read comments

### Logged-in users
- Create a profile
- Add events
- Save spots and events
- Write comments
- Upload photos
- Create new spots *(requires admin approval before public listing)*

### Admin users
- Access the admin dashboard
- Approve new spots
- Promote other users to admin

## 🔎 Search & filters
- Filter spots and events by **category**, **time**, and **distance**
- Search for spots and events
- Navigate to events using navigation apps

## 🔐 How to become an admin

You have two options:

1. **Dev login (quick testing)**
   - Use the dev login endpoint to create a test admin user.
   - Endpoint: `POST /api/auth/dev-login?user_id=1`

2. **Database update**
   - Set `users.is_admin = true` for your user in the database.

Once you have at least one admin, you can promote others using:
`PUT /api/admin/users/{user_id}/role`
