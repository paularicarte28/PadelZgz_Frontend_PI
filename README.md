# PadelZGZ Frontend

Aplicación web para la reserva de pistas de pádel en Zaragoza.

**🔗 Backend API:** [paularicarte28/padelzgz-backend](https://github.com/paularicarte28/PadelZgz_Backend_PI.git)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Estado global | Context API + useReducer |
| HTTP | Axios (interceptores JWT) |
| Backend BFF | Node.js 20 + Express |
| Base de datos | SQLite (better-sqlite3) |
| Tests unitarios | Vitest + Testing Library (22 tests) |
| Tests E2E | Playwright (7 flujos) |
| Contenedores | Docker + Docker Compose |
| API externa | Open-Meteo (meteorología, sin API key) |

---

## Estructura del proyecto

```
├── frontend/          # React 18 + Vite
│   ├── src/
│   │   ├── context/   # AuthContext con useReducer
│   │   ├── hooks/     # useCourts, useReservations
│   │   ├── pages/     # Home, Login, Register, CourtDetail, MisReservas, AdminDashboard
│   │   ├── components/
│   │   └── services/  # Capa de abstracción sobre Axios
│   ├── tests/         # Vitest + Testing Library
│   └── e2e/           # Playwright
│
└── backend/           # Node.js + Express + SQLite
    ├── src/
    │   ├── controllers/
    │   ├── routes/
    │   ├── middleware/ # Auth JWT
    │   └── db/
    └── tests/         # Jest + Supertest
```

---

## Funcionalidades

- 🌤️ **Banner meteorológico** — temperatura y condiciones en Zaragoza (Open-Meteo)
- 🔍 **Filtrado reactivo** de pistas por zona, tipo y precio
- 🔐 **Autenticación JWT** — registro, login, sesión persistente
- 📅 **Reserva de pistas** — selección de franja horaria, cálculo de precio
- 📋 **Mis Reservas** — historial y cancelación
- ⚙️ **Panel Admin** — métricas globales, gestión de todas las reservas

---

## Cómo ejecutar

### Con Docker Compose

```bash
docker-compose up --build
```

Frontend en `http://localhost:5173` · Backend BFF en `http://localhost:3000`

> Asegúrate de tener el [backend Spring Boot](https://github.com/paularicarte28/padelzgz-backend) corriendo en `localhost:8080`

### En local

```bash
# Backend Node.js
cd backend
npm install
npm start

# Frontend React
cd frontend
npm install
npm run dev
```

---

## Tests

```bash
# Tests unitarios (Vitest)
cd frontend
npm test

# Tests E2E (Playwright)
cd frontend
npx playwright test

# Tests backend Node (Jest)
cd backend
npm test
```

---

## Autora

Paula Ricarte — DAM 2024-2025 · Centro San Valero, Zaragoza
