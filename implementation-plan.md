# Implementation Plan

## Phase 1: Project Setup

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Set up FastAPI server with Python (uvicorn)
- [ ] Set up React app with TypeScript, Tailwind CSS, and React Router
- [ ] Set up PostgreSQL database
- [ ] Configure SQLAlchemy ORM and create initial models (users, tickets, sessions)
- [ ] Set up Alembic for database migrations
- [ ] Run initial migration and seed the database with an admin user

## Phase 2: Authentication

- [ ] Create login page on the frontend
- [ ] Implement login API endpoint in FastAPI
- [ ] Implement session-based authentication using FastAPI middleware
- [ ] Implement logout API endpoint
- [ ] Create get current user (`/me`) endpoint
- [ ] Add route protection on the frontend (redirect to login if unauthenticated)

## Phase 3: User Management

- [ ] Create admin user list page
- [ ] Implement create agent API endpoint
- [ ] Implement update agent API endpoint
- [ ] Implement delete agent API endpoint
- [ ] Add role-based access control dependency (admin vs agent) in FastAPI
- [ ] Protect admin-only routes on the frontend

## Phase 4: Ticket CRUD

- [ ] Create ticket list page with filtering and pagination
- [ ] Create ticket detail page
- [ ] Implement create ticket API endpoint
- [ ] Implement update ticket API endpoint (status, assignee, priority)
- [ ] Implement delete ticket API endpoint
- [ ] Add filtering by status, category, and assignee on the frontend

## Phase 5: AI Features

- [ ] Integrate Claude API into the FastAPI backend
- [ ] Implement auto-classification of tickets (category, priority)
- [ ] Implement ticket summary generation
- [ ] Implement suggested reply generation for agents
- [ ] Build knowledge base storage and retrieval
- [ ] Display AI suggestions on the ticket detail page

## Phase 6: Email Integration

- [ ] Set up inbound email webhook to create tickets automatically
- [ ] Implement outbound email reply from ticket detail page
- [ ] Handle email threading (link replies to existing tickets)
- [ ] Store email metadata (from, subject, thread ID) in the database
- [ ] Test end-to-end email to ticket flow

## Phase 7: Dashboard

- [ ] Create dashboard page with stats overview
- [ ] Implement API endpoints for ticket counts by status
- [ ] Add category breakdown chart
- [ ] Add quick filters (open, unassigned, high priority)
- [ ] Show recent activity feed on dashboard

## Phase 8: Polish & Deployment

- [ ] Add form validation on frontend (login, ticket creation)
- [ ] Add global error handling middleware in FastAPI
- [ ] Add loading states and error messages on frontend
- [ ] Write Dockerfile for client and server
- [ ] Set up docker-compose for local development
- [ ] Configure environment variables for production