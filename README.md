# SIH 2025 Team Registration Platform

A team registration and management platform for Smart India Hackathon 2025. Built with Next.js, NextAuth, and MongoDB.

## ✨ Features

- Google OAuth authentication
- Team creation and management  
- Team discovery with WhatsApp integration
- Admin dashboard with data export
- Join request notifications

## � Quick Setup

### 1. Install
```bash
git clone https://github.com/ABHISHEK2k6/sih25.git
cd sih25
npm install
```

### 2. Environment Variables
Create `.env` file:
```env
MONGODB_URI=your_mongodb_connection_string
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXT_PUBLIC_ADMIN_EMAILS=admin@college.edu
ADMIN_EMAIL=admin@college
ADMIN_PASSWORD=your_password
```

### 3. Database Setup
- Create [MongoDB Atlas](https://cloud.mongodb.com) account
- Create cluster and get connection string
- Add to `MONGODB_URI`

### 4. Google OAuth
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create project and OAuth credentials
- Add redirect URI: `https://your-domain.com/api/auth/callback/google`

### 5. Deploy
**Vercel (Recommended):**
- Push to GitHub
- Connect to [Vercel](https://vercel.com)
- Add environment variables
- Deploy

**Or run locally:**
```bash
npm run dev
```

## 🎨 Customization

Edit these files for your college:
- `app/layout.tsx` - Change title and branding
- `components/registration-form.tsx` - Update college name
- `app/data/registration-schema.json` - Modify form fields

## 📊 Admin Access

Access dashboard at `/dashboard` with admin credentials to:
- View all registrations
- Monitor team formation
- Export participant data
- Send announcements

## �️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Authentication**: NextAuth with Google OAuth
- **Database**: MongoDB with Mongoose
- **Deployment**: Vercel recommended

---

**Built for Smart India Hackathon 2025** 🚀