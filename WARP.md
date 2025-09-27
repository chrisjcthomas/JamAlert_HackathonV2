# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

JamAlert is a community resilience alert system for Jamaica, built as a Next.js web application with an Azure Functions backend. The system provides real-time flood warnings, incident reporting, and multi-channel alert distribution to keep Jamaican communities safe.

**Key Technologies:**
- Frontend: Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui components
- Backend: Azure Functions (Node.js/TypeScript), MySQL with Prisma ORM
- Maps: Leaflet.js with OpenStreetMap
- Testing: Jest (unit), Playwright (E2E), comprehensive CI/CD pipeline

## Common Development Commands

### Frontend Development
```bash
# Development
pnpm dev                 # Start development server (localhost:3000)
pnpm build              # Build production bundle
pnpm start              # Start production server
pnpm lint               # ESLint validation

# Testing
pnpm test               # Run Jest unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage report
pnpm test:e2e           # Run Playwright E2E tests
pnpm test:e2e:ui        # Run E2E tests with Playwright UI
pnpm test:e2e:headed    # Run E2E tests with visible browser
pnpm test:all           # Run all test suites

# Run specific test files
pnpm test components/auth/register-form.test.tsx
npx playwright test tests/e2e/critical-journeys.spec.ts
```

### Backend Development
```bash
cd backend

# Development
pnpm start              # Start Azure Functions runtime
pnpm build              # Compile TypeScript
pnpm watch              # Watch mode compilation

# Database Operations
pnpm db:generate        # Generate Prisma client
pnpm db:push           # Push schema to database (dev)
pnpm db:migrate         # Create and run migrations
pnpm db:migrate:deploy  # Deploy migrations to production
pnpm db:migrate:reset   # Reset database (destructive)
pnpm db:seed            # Seed database with test data
pnpm db:studio          # Open Prisma Studio

# Testing (Backend specific)
pnpm test               # Run all backend tests
pnpm test:integration   # Integration tests only
pnpm test:api          # API endpoint tests
pnpm test:database     # Database tests
pnpm test:load         # Load testing (up to 5 minutes)
pnpm test:all          # Comprehensive test suite
```

### Single Test Execution
```bash
# Frontend single test
pnpm test -- --testNamePattern="should validate required fields"
pnpm test components/forms/report-form.test.tsx

# Backend single test
cd backend
pnpm test src/functions/__tests__/alerts-send.test.ts
pnpm test -- --testPathPattern="admin-dashboard"

# E2E single test
npx playwright test --grep="user registration flow"
npx playwright test tests/e2e/critical-journeys.spec.ts --headed
```

## High-Level Architecture

### System Architecture
JamAlert uses a hybrid architecture with a Next.js frontend deployed on Vercel and Azure Functions backend for serverless processing:

```
Next.js Frontend (Vercel)
├── User-facing pages (registration, reporting, maps)
├── Admin portal with authentication
└── Real-time map with incident visualization

Azure Functions Backend
├── User management & authentication (JWT-based)
├── Alert dispatch system (multi-channel: email, SMS, push)
├── Weather monitoring (automated triggers)
├── Incident processing & approval workflows
└── Admin APIs & audit logging

Database Layer (MySQL + Prisma)
├── Users, incidents, alerts, weather data
├── Comprehensive audit trails
└── Performance-optimized with proper indexing
```

### Key Architectural Patterns

**Frontend Patterns:**
- App Router with RSC (React Server Components)
- Component composition using shadcn/ui
- Form validation with zod schemas
- Route-level authentication via middleware
- Progressive enhancement for accessibility

**Backend Patterns:**
- Serverless functions with Azure Functions v4
- Repository pattern with Prisma ORM
- Event-driven alert processing
- Batch processing for high-volume dispatches
- Comprehensive error handling with graceful degradation

**Data Flow:**
1. Users register → Stored in MySQL with parish-based segmentation
2. Weather APIs → Threshold checking → Automated alert triggers
3. Manual incidents → Admin review → Community alerts
4. Alert dispatch → Multi-channel delivery → Delivery tracking

### Parish-Based Architecture
The system is fundamentally organized around Jamaica's 14 parishes, with parish-specific:
- User registration and alert preferences
- Weather thresholds and monitoring
- Incident reporting and validation
- Alert targeting and delivery optimization

## Database Schema Highlights

**Core Models:**
- `User`: Parish-based registration with accessibility settings
- `Alert`: Multi-parish support with delivery tracking
- `IncidentReport`: Community reporting with verification workflow
- `WeatherData`: Real-time monitoring with automated thresholds
- `AdminUser`: Role-based access with comprehensive audit logging

**Key Relationships:**
- Users belong to parishes → Alerts target specific parishes
- Incidents require admin approval → Verified incidents trigger alerts
- Weather thresholds per parish → Automated alert generation
- Comprehensive audit trails for all admin actions

## Testing Strategy

### Test Structure
```
tests/
├── accessibility/          # WCAG compliance & screen reader tests  
├── e2e/                    # Playwright critical user journeys
├── integration/            # Cross-system integration tests
├── performance/            # Load testing (5k+ concurrent users)
└── security/              # Security audit & penetration testing

backend/src/functions/__tests__/    # Function-level unit tests
backend/src/services/__tests__/     # Service layer tests
```

### Test Categories
- **Unit Tests:** Component logic, form validation, API functions
- **Integration Tests:** Database operations, external API interactions
- **E2E Tests:** Full user workflows (registration → alert receipt)
- **Load Tests:** Alert dispatch under high volume
- **Security Tests:** Authentication, authorization, input validation

### CI/CD Pipeline
Comprehensive GitHub Actions workflow with:
- Frontend/backend unit tests (parallel execution)
- Integration tests with MySQL service
- E2E tests with Playwright
- Load testing (triggered by schedule or commit message)
- Security auditing and dependency checks

## Authentication & Authorization

### User Authentication
- JWT-based with 30-minute expiration
- Parish-based access control
- Session management in MySQL
- Middleware-based route protection

### Admin Authentication
- Role-based access (admin, moderator)
- Comprehensive audit logging
- IP address and user agent tracking
- Secure password hashing with bcrypt

### Route Protection
```typescript
// Protected routes via middleware.ts
const protectedRoutes = ["/dashboard", "/admin"]
const adminRoutes = ["/admin"]
```

## Environment-Specific Behavior

### Development Mode
- Mock weather APIs for testing
- Simplified email delivery (console logging)
- Debug-level logging for all operations
- Auto-seeded database with test data

### Production Mode  
- Real weather API integration (Jamaica Met Service)
- Full email/SMS delivery via Azure services
- Performance monitoring with Application Insights
- Automated database backups and health checks

## Key Configuration Files

### Frontend Configuration
- `next.config.js`: Next.js settings, API proxying
- `tailwind.config.ts`: Design system customization
- `components.json`: shadcn/ui configuration
- `middleware.ts`: Route protection and auth logic

### Backend Configuration
- `host.json`: Azure Functions runtime settings
- `prisma/schema.prisma`: Complete database schema
- Function-specific configs in `src/functions/`

### Testing Configuration  
- `jest.config.js`: Frontend test configuration
- `playwright.config.ts`: E2E test settings with multi-browser support
- `backend/jest.config.js`: Backend-specific Jest setup

## Deployment Architecture

### Frontend (Vercel)
- Automatic deployments from main branch
- Environment-specific API endpoints
- CDN optimization for static assets
- Performance monitoring integration

### Backend (Azure Functions)
- Serverless auto-scaling
- MySQL In-App database (free tier optimized)
- Scheduled functions for weather monitoring
- Application Insights for monitoring

### Infrastructure as Code
Azure Bicep templates in `infrastructure/`:
- Environment-specific parameter files
- Monitoring and alerting setup
- Database configuration and networking

## Performance Considerations

### Frontend Optimization
- Next.js automatic code splitting
- Lazy loading for non-critical components
- Optimized map rendering with marker clustering
- Service worker for offline alert caching

### Backend Optimization
- Batch processing for alert dispatch (100 users per batch)
- Database connection pooling
- Query optimization with proper indexing
- Function cold start mitigation

### Scalability Targets
- 5,000+ concurrent users during emergencies
- Sub-30-second alert dispatch across all parishes
- 99.9% uptime during normal operations
- 3-second page load times under normal conditions

## Security & Privacy

### Data Protection
- HTTPS enforcement for all communications
- Sensitive data encryption at rest
- Anonymous reporting capabilities
- GDPR-compliant data deletion workflows

### Input Validation
- Comprehensive zod schema validation
- SQL injection prevention via Prisma
- XSS protection through content security policies
- Rate limiting on all public endpoints

## Accessibility & Internationalization

### Accessibility Features
- WCAG 2.1 AA compliance
- High contrast mode support
- Large font options
- Screen reader compatibility
- Keyboard navigation support

### Multi-language Support
- i18n framework with React context
- English and Spanish translations
- Parish-specific language preferences
- Emergency alert translation workflows