# Messenger Logistics - Shipment Tracking System

A comprehensive MERN Stack (MongoDB, Express, React, Node.js) application for tracking shipments from China to Rwanda via Mombasa.

## 📁 Project Structure

```
messenger-tracking/
├── backend/                 # Node.js + Express API
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   ├── uploads/            # File uploads directory
│   ├── server.js           # Main server file
│   ├── package.json
│   └── .env
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── wireframes/             # UI/UX wireframes
```

## 🚀 Features

### Client Portal
- ✅ User authentication (Login/Register)
- ✅ Dashboard with shipment overview
- ✅ View shipment details with timeline
- ✅ Upload and download documents
- ✅ Real-time notifications
- ✅ Multi-language support (EN/RW/SW)

### Staff Portal
- ✅ Create and manage shipments
- ✅ Track invoice collection
- ✅ Verify documents
- ✅ Manage tasks
- ✅ Update shipment status

### Manager Dashboard
- ✅ Operations overview
- ✅ Invoice collection status
- ✅ Performance analytics
- ✅ Staff management
- ⚠️ Alerts for missing ETA/documents

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** for authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing

### Frontend
- **React 18** + **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for data fetching
- **Zustand** for state management
- **Recharts** for charts
- **date-fns** for date formatting

## 📊 Database Models

1. **User** - Clients, Staff, Managers
2. **Shipment** - Container tracking
3. **Document** - File management
4. **Invoice** - Payment tracking
5. **Task** - Workflow management
6. **Notification** - User notifications
7. **StatusHistory** - Audit trail
8. **Message** - Chat system
9. **Rating** - Feedback system

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Shipments
- `GET /api/shipments` - List shipments
- `GET /api/shipments/:id` - Get shipment details
- `POST /api/shipments` - Create shipment
- `PUT /api/shipments/:id/status` - Update status
- `GET /api/shipments/stats/overview` - Get statistics

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:id/download` - Download document
- `PUT /api/documents/:id/verify` - Verify document

### Dashboard
- `GET /api/dashboard/overview` - Overview stats
- `GET /api/dashboard/invoice-collection` - Invoice status
- `GET /api/dashboard/performance` - Performance metrics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start server
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📝 Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/messenger-tracking
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 🎨 Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #1E88E5 | Headers, buttons, links |
| Accent Orange | #F26522 | CTAs, highlights |
| Success Green | #4CAF50 | Success states |
| Warning Yellow | #FFC107 | Warnings, pending |
| Error Red | #F44336 | Errors, alerts |

## 📱 Shipment Status Flow

```
Created → On Sea → Arrived Mombasa → Discharged → Documents Ready → 
Payment Pending → Payment Received → Cleared → In Transit → 
At Warehouse → Delivered → Completed
```

## 🔒 Document Locking

Documents are automatically locked until payment is received:
- **Locked**: BL, Packing List, Sea Freight Invoice
- **Unlock**: After payment confirmation

## 👥 User Roles

1. **Client** - View own shipments, upload documents
2. **Staff** - Create shipments, verify documents
3. **Manager** - Full access, analytics, user management
4. **Admin** - System administration

## 📄 License

MIT License - Messenger Logistics & Trade Ltd
