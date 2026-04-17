# ParcelHub - Personal Package Management System

A lightweight, self-hosted package management system for receiving, tracking, and
distributing packages on behalf of friends and contacts.

## Architecture

```
parcel-hub/
├── client/          # React + TypeScript + Vite + shadcn/ui
├── server/          # Fastify + TypeScript + Prisma + SQLite
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Node.js >= 20.x
- npm >= 10.x
- (Optional) Docker & Docker Compose for containerized deployment

## Quick Start (Development)

### 1. Clone and install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Set up the database

```bash
cd server

# Copy the example env file and edit it
cp .env.example .env
# Edit .env to configure your SMTP settings for email notifications

# Generate Prisma client and create the database
npx prisma generate
npx prisma db push
# (Optional) Seed the database with sample data
npx prisma db seed
```

### 3. Start development servers

Open two terminal windows:

```bash
# Terminal 1: Start the backend (runs on port 3001)
cd server
npm run dev

# Terminal 2: Start the frontend (runs on port 5173)
cd client
npm run dev
```

### 4. Open in browser

Navigate to http://localhost:5173

## Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Frontend         | React 19, TypeScript, Vite, shadcn/ui, Tailwind |
| Backend          | Fastify, TypeScript                             |
| Database         | SQLite via Prisma ORM                           |
| Email            | Nodemailer (any SMTP provider)                  |
| Barcode Generate | bwip-js                                         |
| Barcode Scan     | html5-qrcode (camera), HID mode (USB scanner)   |
| Label Print      | PDF via pdfkit, or browser print dialog          |

## Key Concepts

- **Recipients**: Your friends who receive mail at your address.
- **Packages**: Individual items received, each assigned a unique barcode.
- **Bins**: Storage locations in your home (shelves, boxes, etc.).
- **Intake**: The process of logging a new package and notifying the recipient.
- **Pickup**: Scanning a barcode to mark a package as collected.
