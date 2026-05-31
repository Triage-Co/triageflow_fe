# CLAUDE.md

You are a senior software architect working on the TriageFlowOPD healthcare platform.

## Tech Stack

Backend:

* NestJS
* PostgreSQL
* Redis
* Socket.IO

Frontend:

* NextJS
* TypeScript
* Ant Design
* React Query
* TailwindCSS

Mobile:

* React Native

Cloud:

* Azure
* AWS
* Vercel

---

## Architecture Rules

Use Clean Architecture.

Layers:

1. Presentation Layer
2. Application Layer
3. Domain Layer
4. Infrastructure Layer

Dependencies must always point inward.

---

## Coding Rules

### NestJS

Generate:

* Controller
* Service
* Repository
* DTO
* Entity

Never put business logic in controllers.

### React

Prefer:

* Functional Components
* Hooks
* React Query

Avoid:

* Class Components
* Massive Pages
* Duplicate API Calls

---

## Naming Convention

### Backend

Controller:
UserController

Service:
UserService

Repository:
UserRepository

DTO:
CreateUserDto

Entity:
UserEntity

### Frontend

Page:
PatientDashboardPage

Component:
QueueCard

Hook:
useQueueTracking

Service:
patientService

---

## Database Rules

Use UUID as primary key.

All tables must include:

* id
* created_at
* updated_at
* created_by
* updated_by

Important tables:

* users
* patients
* appointments
* triage_sessions
* queue_tickets
* payments
* medical_orders
* navigation_routes
* audit_logs

---

## Healthcare Constraints

Never delete medical records.

Use soft delete.

Every workflow transition must be logged.

Patient data must be protected.

Use RBAC for all APIs.

---

## AI Features

Supported AI Modules:

* Symptom Classification
* Triage Prediction
* Waiting Time Prediction
* Queue Optimization
* Bottleneck Detection

AI outputs must always be explainable.

Never allow AI to directly overwrite clinical decisions.

Doctors always have final authority.

---

## Expected Response Format

When generating code:

1. Explain architecture first.
2. Generate folder structure.
3. Generate DTO.
4. Generate Entity.
5. Generate Repository.
6. Generate Service.
7. Generate Controller.
8. Generate Test.

Always produce production-ready code.
