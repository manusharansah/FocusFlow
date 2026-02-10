# 🎯 Smart Task & Focus Manager

A full-stack SaaS application for task management and productivity tracking with subscription-based premium features.

## 🚀 Features

### Core Features
- ✅ **User Authentication** - JWT-based secure login/registration
- ✅ **Task Management** - Create, update, delete tasks with priorities
- ✅ **Subscription System** - Stripe payment integration (test mode)
- ✅ **Analytics Dashboard** - Productivity insights with charts

### Premium Features (Paid)
- ⏱️ **Focus Timer** - Pomodoro-style focus sessions
- 📊 **Advanced Analytics** - Focus time tracking
- ∞ **Unlimited Tasks** - No limits on task creation

### Free Tier Limitations
- 10 tasks maximum
- No focus timer
- Basic analytics only

## 🛠️ Tech Stack

### Backend
- **Django** - Web framework
- **Django REST Framework** - API development
- **SQLite** - Database (can switch to PostgreSQL)
- **Stripe** - Payment processing

### Frontend
- **React** - UI library
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **React Router** - Navigation

## 📦 Installation

### Prerequisites
- Python 3.8+
- Node.js 14+
- pip
- npm

### Backend Setup
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers stripe python-decouple

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver
```

### Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## 🔑 Environment Variables

Create `.env` file in backend folder:
```
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

## 🧪 Testing Payments

Use Stripe test card:
- **Card Number**: 4242 4242 4242 4242
- **Expiry**: Any future date
- **CVC**: Any 3 digits

## 📸 Screenshots

[Add screenshots here after deployment]

## 🎓 Learning Outcomes

This project demonstrates:
- Full-stack development skills
- RESTful API design
- JWT authentication implementation
- Payment gateway integration
- Role-based access control
- Data visualization
- State management in React

## 📝 API Endpoints

### Authentication
- `POST /api/users/register/` - User registration
- `POST /api/users/login/` - User login
- `GET /api/users/profile/` - Get user profile

### Tasks
- `GET /api/tasks/` - List user tasks
- `POST /api/tasks/` - Create task
- `PATCH /api/tasks/{id}/` - Update task
- `DELETE /api/tasks/{id}/` - Delete task

### Payments
- `POST /api/payments/create-checkout/` - Create Stripe checkout
- `POST /api/payments/verify-payment/` - Verify payment

### Analytics
- `GET /api/analytics/stats/` - Get user analytics

## 🚀 Deployment

### Backend (Heroku/Railway)
1. Add `Procfile`
2. Configure PostgreSQL
3. Set environment variables
4. Deploy

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy build folder
3. Configure API URL

## 👨‍💻 Author

[Manu Sharan Sah]
- GitHub: [@manusharan]
- LinkedIn: [manusharansah]

## 📄 License

MIT License