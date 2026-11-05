# Multi-stage Dockerfile for PulseHub (Vue 3 + Express TS)
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Build Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# 2. Build Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npm run build

# 3. Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY backend/package*.json ./
RUN npm install --only=production

# Copy compiled backend dist and frontend dist
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "dist/index.js"]
