# StudyPath

THM DMS Studienplaner mit KI Unterstützung

A study planning application for THM (Technische Hochschule Mittelhessen) students built with TypeScript, Express, and Drizzle ORM.

## Features

- **Complete THM Module Catalog**: 96 real THM modules across 4 pools
- **Study Plan Management**: Create and manage custom study plans
- **Progress Tracking**: Track module completion and grades
- **Module Organization**: Modules organized by pools (Orientierungsphase, IT Vertiefung, etc.)
- **Type-Safe Database**: Drizzle ORM with full TypeScript support
- **Security**: Helmet, CORS, compression, and validation middleware

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Security**: Helmet, CORS, Joi validation
- **Development**: Nodemon, ESLint, Prettier

## Setup

### Prerequisites

- Node.js (version 18 or higher)
- npm
- Docker (for PostgreSQL database)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   npm install drizzle-orm drizzle-kit pg @types/pg
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Start PostgreSQL database:
   ```bash
   docker-compose up -d
   ```
5. Initialize database:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on port 3000 by default.

### Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:generate` - Generate migration files
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Populate database with THM modules (96 modules)
- `npm run db:studio` - Open Drizzle Studio (database browser)

## Database Schema

The project uses PostgreSQL with Drizzle ORM. The database includes:

### Module Pools

- **Orientierungsphase** (7 modules) - Foundation courses
- **IT Vertiefung** (11 modules) - Core IT specialization courses
- **Überfachlicher Pool** (21 modules) - General education courses
- **Wahlpflichtpool** (57 modules) - Elective courses

### Tables

- **users**: Student accounts with authentication
- **modules**: Complete THM course catalog with pool, code, name, credits, category
- **user_modules**: Student progress tracking with status, grades, notes
- **study_plans**: Custom study plans created by students
- **study_plan_modules**: Modules assigned to specific study plans

### Sample Modules

- **MAN1001**: Grundlagen und Unternehmenssoftware (10 credits, MAN)
- **INF1001**: Webbasierte Programmierung 1 (10 credits, INF)
- **INF2528**: Machine Learning (6 credits, INF)
- **INF2549**: KI in der Anwendung: Sprachverarbeitung mit Transformern (6 credits, INF)

## API Structure

The application follows RESTful API principles with proper error handling, validation, and security middleware.
