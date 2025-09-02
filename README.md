# SIH 2025 - Team Registration Platform

A comprehensive team registration platform built for Smart India Hackathon 2025, featuring participant registration, team formation, and administrative dashboard.

## 🚀 Features

### 📝 **Participant Registration**
- Individual participant registration with detailed information
- Google OAuth integration for secure authentication
- Form validation and data persistence
- Responsive design for all devices

### 👥 **Team Management**
- Create and join teams (6 members maximum)
- Team leader and member role management
- Real-time team status tracking
- Team invitation system

### 📊 **Admin Dashboard**
- Simple login interface with hardcoded credentials
- Comprehensive statistics and analytics
- Participant and team data visualization
- Excel export functionality
- Email broadcast system
- Registration status monitoring

### 🔧 **Technical Features**
- Built with Next.js 15 and React 19
- MongoDB database with Mongoose ODM
- Tailwind CSS for styling
- TypeScript for type safety
- Responsive design

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB (Azure Cosmos DB)
- **Authentication**: Google OAuth (for participants), Simple login (for admin)
- **Styling**: Tailwind CSS
- **Validation**: Custom form validation
- **Export**: Excel file generation

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB database
- Google OAuth credentials
- npm or yarn package manager

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sih25
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```properties
   MONGODB_URI=your_mongodb_connection_string
   AUTH_GOOGLE_ID=your_google_oauth_client_id
   AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication Setup

### Google OAuth Configuration (For Participants)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Admin Dashboard Access

The admin dashboard uses simple hardcoded credentials for demonstration purposes:

- **URL**: `/dashboard`
- **Email**: `admin@example.com`
- **Password**: `admin123`

> **⚠️ Security Note**: These are demo credentials. In production, implement proper authentication with secure passwords and user management.

## 📁 Project Structure

```
sih25/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── dashboard/         # Dashboard API endpoints
│   │   ├── participants/      # Participant management
│   │   └── teams/            # Team management
│   ├── dashboard/             # Admin dashboard
│   ├── register/              # Registration pages
│   └── layout.tsx             # Root layout
├── components/                # Reusable components
│   ├── admin-login.tsx       # Admin login component
│   ├── navbar.tsx            # Navigation component
│   └── ui/                   # UI components
├── lib/                      # Utility functions
│   ├── mongodb.ts            # Database connection
│   └── models/               # Database models
├── public/                   # Static assets
└── styles/                   # Global styles
```

## 🎯 Usage

### For Participants

1. **Registration**
   - Visit `/register`
   - Sign in with Google
   - Fill out the registration form
   - Submit to create participant profile

2. **Team Formation**
   - Visit `/register/team`
   - Create a new team or join existing team
   - Teams can have maximum 6 members
   - First member becomes team leader

### For Administrators

1. **Dashboard Access**
   - Visit `/dashboard`
   - Login with demo credentials:
     - **Email**: `admin@example.com`
     - **Password**: `admin123`

2. **Dashboard Features**
   - View registration statistics
   - Monitor team formation progress
   - Export participant data
   - Send broadcast emails
   - Track completion rates

## 📊 Database Schema

### Participant Model
```typescript
{
  email: string (unique)
  name: string
  fields: {
    phone: string
    department: string
    year: string
    college: string
    // ... other fields
  }
  createdAt: Date
}
```

### Team Model
```typescript
{
  teamName: string (unique)
  teamLeader: ObjectId (ref: Participant)
  members: ObjectId[] (ref: Participant)
  createdAt: Date
}
```

## 🔧 API Endpoints

### Public Endpoints
- `GET /api/participants` - Get all participants
- `POST /api/participants` - Create participant
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team
- `POST /api/teams/join` - Join team

### Dashboard Endpoints (Admin Only)
- `GET /api/dashboard/participants` - Get participants with team status
- `GET /api/dashboard/teams` - Get teams data
- `GET /api/dashboard/export` - Export data to Excel
- `POST /api/dashboard/broadcast` - Send broadcast emails

> **⚠️ Security Warning**: Currently, dashboard APIs are publicly accessible. In production, implement proper API authentication.

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 🔒 Security Notes

- **Environment Variables**: Never commit `.env` file to version control
- **Admin Credentials**: Currently using demo credentials - change for production
- **API Security**: Dashboard APIs need authentication in production
- **Database**: Use strong connection strings and authentication
- **OAuth**: Secure Google OAuth credentials properly

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check `MONGODB_URI` format
   - Ensure database is accessible
   - Verify network connectivity

2. **Google OAuth Error**
   - Verify OAuth credentials
   - Check redirect URI configuration
   - Ensure Google+ API is enabled

3. **Admin Dashboard Access**
   - Use demo credentials: `admin@example.com` / `admin123`
   - Check browser console for errors

## 📝 Production Checklist

Before deploying to production:

- [ ] Change admin credentials from demo values
- [ ] Implement proper API authentication
- [ ] Secure environment variables
- [ ] Update OAuth redirect URIs
- [ ] Review and update security settings

## 👥 Contributors

- **Team SIH25** - Initial development

## 📞 Support

For support and questions, please contact the development team.

---

**Note**: This is a hackathon project built for SIH 2025. The current implementation uses simplified authentication for demonstration purposes. Implement proper security measures before production deployment.
