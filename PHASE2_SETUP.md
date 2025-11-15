# Phase 2 Setup Guide

## Overview
Phase 2 adds:
- **Authentication** with NextAuth (credentials + Google OAuth)
- **Dashboard UI** with React Query, Recharts, Tailwind CSS
- **Site Management** (create, view, delete sites)
- **Analytics SDK** (JavaScript tracking script)
- **Session Tracking** and advanced analytics

## Prerequisites
- Node.js >= 18
- MongoDB running (local or remote)
- Redis running (local or remote)
- All Phase 1 backend features working

## Installation Steps

### 1. Install Dependencies
```powershell
npm install
```

This will install:
- `next-auth` - Authentication
- `@tanstack/react-query` - Server state management
- `recharts` - Data visualization
- `tailwindcss` - Styling framework
- `lucide-react` - Icon library
- `bcryptjs` - Password hashing
- `date-fns` - Date utilities

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update values:

```powershell
Copy-Item .env.example .env
```

Required variables:
```env
MONGODB_URI=mongodb://localhost:27017/analytics
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

Optional (for Google OAuth):
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Start Services

Start MongoDB and Redis:
```powershell
# MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Redis
docker run -d -p 6379:6379 --name redis redis:latest
```

Or use Docker Compose:
```powershell
npm run docker:up
```

### 4. Run the Application

Start the Next.js server:
```powershell
npm run dev
```

Start the worker (in another terminal):
```powershell
npm run worker
```

The application will be available at `http://localhost:3000`

## Usage Guide

### 1. Create an Account
1. Navigate to `http://localhost:3000/auth/signup`
2. Enter your name, email, and password (min 8 characters)
3. Click "Sign up" - you'll be automatically signed in and redirected to the dashboard

### 2. Create Your First Site
1. On the dashboard, click "Create Your First Site"
2. Enter a site name (e.g., "My Blog")
3. Optionally provide a custom site ID (or leave blank to auto-generate)
4. Click "Create Site"

You'll receive:
- **Site ID**: Used to identify your site
- **API Key**: Used for authentication

### 3. Install the Tracking Script
Add this script to your website's HTML (before closing `</body>` tag):

```html
<script>
  window.ANALYTICS_API_URL = 'http://localhost:3000/api/event';
  window.ANALYTICS_SITE_ID = 'your-site-id';
  window.ANALYTICS_API_KEY = 'your-api-key';
</script>
<script src="http://localhost:3000/analytics.js"></script>
```

The SDK will automatically track:
- Page views
- Unique visitors
- Session duration
- Device type, browser, OS
- Outbound link clicks

### 4. Track Custom Events
Use the JavaScript API to track custom events:

```javascript
// Track a custom event
window.analytics.track('button_click', {
  button_name: 'signup',
  page: 'homepage'
});

// Manually track a page view
window.analytics.trackPageView();

// Track an outbound link
window.analytics.trackOutbound('https://example.com');
```

### 5. View Analytics
1. Go to `http://localhost:3000/dashboard`
2. Select a site from the dropdown
3. Choose a date range
4. View:
   - **Summary Cards**: Total views, unique visitors, avg session duration, bounce rate
   - **Traffic Chart**: Daily views and visitors over time
   - **Device Chart**: Breakdown by device type
   - **Top Pages**: Most visited pages

### 6. Manage Sites
- View all sites: `http://localhost:3000/dashboard/sites`
- Create new site: `http://localhost:3000/dashboard/sites/new`
- Delete a site: Click the trash icon on the sites page

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/[...nextauth]` - NextAuth endpoints (signin, signout, session)

### Sites
- `GET /api/sites` - List user's sites (authenticated)
- `POST /api/site/create` - Create new site (authenticated)
- `DELETE /api/sites/[site_id]` - Delete site (authenticated)

### Analytics
- `POST /api/event` - Track event (API key auth)
- `GET /api/stats?site_id=...&start_date=...&end_date=...` - Get stats (authenticated)

## Features

### Authentication
- **Email/Password**: Create account with email and password
- **Google OAuth**: Sign in with Google (if configured)
- **Protected Routes**: Dashboard requires authentication
- **Auto-site Creation**: New users get a default site automatically

### Dashboard
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode**: Automatically follows system preference
- **Real-time Updates**: Data refreshes when you switch dates/sites
- **Date Range Picker**: Last 7, 14, 30, or 90 days

### Analytics SDK
- **Auto-tracking**: Automatically tracks page views and user behavior
- **Session Management**: Tracks sessions across page views
- **Device Detection**: Identifies desktop, mobile, tablet
- **Browser/OS Detection**: Tracks browser and operating system
- **Lightweight**: Minimal performance impact (~3KB gzipped)

### Session Tracking
- **Visitor ID**: Persistent across sessions (localStorage)
- **Session ID**: Unique per session (sessionStorage)
- **Page Count**: Tracks pages viewed in session
- **Duration**: Tracks time spent on site

## Troubleshooting

### "Unauthorized" Error
- Make sure you're signed in
- Check that NEXTAUTH_SECRET is set in `.env`
- Try signing out and back in

### Charts Not Showing
- Ensure you have tracking data (visit your website with the SDK installed)
- Run the worker to process events: `npm run worker`
- Check the selected date range includes days with data

### Cannot Sign In
- Verify MongoDB is running: `docker ps`
- Check MongoDB connection string in `.env`
- Look for errors in the terminal running `npm run dev`

### Missing Dependencies Error
- Run `npm install` to install all dependencies
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

## Development

### Run Tests
```powershell
npm test
```

### Type Check
```powershell
npm run type-check
```

### Build for Production
```powershell
npm run build
npm start
```

## Next Steps
- Set up production deployment (Vercel, AWS, etc.)
- Configure Google OAuth for social login
- Add more chart types and analytics features
- Implement hourly stats for real-time analytics
- Add automated insights and anomaly detection
