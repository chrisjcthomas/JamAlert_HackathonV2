# JamAlert Community Resilience Alert System

A comprehensive emergency alert and incident reporting system for Jamaica, built with Next.js and Azure Functions.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **pnpm** 8+ (Package Manager)
- **MySQL** 8.0+ (for backend)
- **Azure Functions Core Tools** (for backend development)

### Installation

1. **Install pnpm** (if not already installed):
   ```bash
   npm install -g pnpm
   ```

2. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd JamAlert_Hackathon
   ```

3. **Install frontend dependencies**:
   ```bash
   pnpm install
   ```

4. **Install backend dependencies**:
   ```bash
   cd backend
   pnpm install
   ```

### Development

#### Frontend Development
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

#### Backend Development
```bash
cd backend

# Start Azure Functions locally
pnpm start

# Build TypeScript
pnpm build

# Watch for changes
pnpm watch

# Database operations
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio
```

### Testing

#### Frontend Testing
```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run end-to-end tests
pnpm test:e2e

# Run all tests
pnpm test:all
```

#### Backend Testing
```bash
cd backend

# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Run load tests
pnpm test:load

# Run all tests
pnpm test:all
```

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 15.2.4 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Maps**: Leaflet.js for interactive mapping
- **State Management**: React hooks and context
- **Testing**: Jest + Playwright for E2E testing

### Backend
- **Runtime**: Azure Functions with Node.js 18+
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT tokens
- **Notifications**: Multi-channel (Email, SMS, Push)
- **Testing**: Jest with comprehensive test suites

## 📁 Project Structure

```
JamAlert_Hackathon/
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                   # Shared utilities
├── backend/               # Azure Functions backend
│   ├── src/functions/     # Function endpoints
│   ├── prisma/           # Database schema
│   └── tests/            # Backend tests
├── tests/                # Frontend E2E tests
├── infrastructure/       # Azure deployment configs
└── DOCS/                 # Documentation
```

## 🚀 Deployment

### Frontend Deployment (Vercel)
```bash
# Deploy to Vercel
pnpm build
./deploy.sh    # Linux/macOS
./deploy.ps1   # Windows
```

### Backend Deployment (Azure)
The backend deploys automatically via GitHub Actions when pushing to main/develop branches.

Manual deployment:
```bash
cd backend
pnpm build
func azure functionapp publish <function-app-name>
```

## 🧪 Testing Strategy

### Comprehensive Testing Suite
- **Unit Tests**: Jest for component and function testing
- **Integration Tests**: Full system workflow testing
- **E2E Tests**: Playwright for user journey testing
- **Load Tests**: Performance testing for 1000+ concurrent users
- **Security Tests**: OWASP compliance and penetration testing
- **Accessibility Tests**: WCAG 2.1 AA compliance

### CI/CD Pipeline
- Automated testing on all pull requests
- Deployment pipeline with health checks
- Performance monitoring and alerting

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://your-function-app.azurewebsites.net
NEXT_PUBLIC_ENVIRONMENT=development
```

#### Backend (local.settings.json)
```json
{
  "IsEncrypted": false,
  "Values": {
    "DATABASE_URL": "mysql://user:password@localhost:3306/jamalert",
    "JWT_SECRET": "your-jwt-secret",
    "SMTP_HOST": "smtp.example.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "your-email@example.com",
    "SMTP_PASS": "your-password",
    "WEATHER_API_KEY": "your-weather-api-key"
  }
}
```

## 📚 Documentation

- [User Guide](DOCS/USER_GUIDE.md) - End-user documentation
- [Admin Guide](DOCS/ADMIN_GUIDE.md) - Administrator documentation
- [API Documentation](backend/README.md) - Backend API reference
- [Deployment Guide](DOCS/PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `pnpm install`
4. Make your changes
5. Run tests: `pnpm test:all`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Development Guidelines
- Use pnpm for all package management
- Follow TypeScript best practices
- Write tests for new features
- Ensure accessibility compliance
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the DOCS/ directory
- **Issues**: Create a GitHub issue
- **Emergency Support**: Contact system administrators

## 🏆 Features

- ✅ Real-time emergency alerts
- ✅ Incident reporting with geolocation
- ✅ Interactive map visualization
- ✅ Multi-channel notifications
- ✅ Administrative dashboard
- ✅ Weather monitoring integration
- ✅ Mobile-responsive design
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Comprehensive testing suite
- ✅ Production-ready deployment

---

**Built for Jamaica's emergency management and community resilience needs** 🇯🇲
