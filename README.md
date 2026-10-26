
# CarMatch KZ 🚗

**Smart car recommendation platform for the Kazakhstan used-car market.**

CarMatch KZ is a full-stack web application that helps users find suitable cars based on their budget, preferred specifications, and location.

The application filters listings, ranks matching vehicles, and explains why each recommendation may fit the user's preferences.

> **Project status:** MVP in development. The current version uses synthetic demonstration data. Official integration with Kolesa.kz has not yet been implemented.

## Features

- Search cars by budget, year, mileage, transmission, body type, fuel type, brand, and city.
- Rank matching cars using a weighted scoring algorithm.
- Explain recommendation scores with reasons and warnings.
- Filter, sort, and paginate the listing catalog.
- Store vehicle listings in PostgreSQL.
- Validate API requests using Pydantic.
- Run automated backend tests with pytest.
- Build the frontend for production.
- Compare prices with similar listings when sufficient comparable data is available.
- Report insufficient comparison data instead of making unsupported market-price claims.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Validation | Pydantic |
| Testing | Pytest, HTTPX |
| Development environment | Docker Compose |
| CI | GitHub Actions |

## Architecture

```text
React + TypeScript
        |
        | HTTP / JSON
        v
FastAPI REST API
        |
        +----------------------+
        |                      |
        v                      v
Listing Repository       Recommendation Engine
        |                      |
        v                      |
    PostgreSQL <---------------+
```

The listing repository handles database queries. The recommendation engine applies mandatory filters and calculates weighted scores for matching vehicles.

The application currently uses synthetic listings through a development data provider. Real listing integration is planned separately, subject to permission and an agreed data access method.

## Requirements

- Python 3.11 or newer
- Node.js LTS and npm
- Docker Desktop with Docker Compose

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/scamblzy/carmatch-kz.git
cd carmatch-kz
```

### 2. Configure environment variables

Copy the example configuration:

```powershell
Copy-Item .env.example .env
```

The local development database URL should use port `5433`:

```env
DATABASE_URL=postgresql+psycopg://carmatch:carmatch_dev_password@localhost:5433/carmatch
```

Do not commit `.env` or production credentials.

### 3. Start PostgreSQL

From the project root:

```bash
docker compose up -d db
```

### 4. Install backend dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Apply database migrations:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Load the synthetic demonstration listings:

```powershell
.\.venv\Scripts\python.exe -m app.seed
```

Start the API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

Interactive API documentation: `http://127.0.0.1:8000/docs`

Health check: `http://127.0.0.1:8000/health`

### 5. Start the frontend

Open a second terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| GET | `/api/v1/listings` | Search and paginate listings |
| POST | `/api/v1/recommendations` | Filter and rank cars |
| GET | `/docs` | Interactive Swagger documentation |

### Example recommendation request

```json
{
  "budget_max": 6000000,
  "year_min": 2015,
  "mileage_max": 160000,
  "transmission": "automatic",
  "body_type": "sedan",
  "preferred_make": "Toyota",
  "city": "Astana"
}
```

The response contains matching listings, their scores, explanations, and warnings.

## Running Tests

From the `backend` directory:

```powershell
.\.venv\Scripts\python.exe -m pytest tests -v
```

## Production Build

From the `frontend` directory:

```bash
npm run build
```

The generated production files are written to `frontend/dist`.

## Data and Limitations

- The current catalog contains synthetic demonstration listings.
- `example.com` links are placeholders, not real car advertisements.
- Recommendation scores indicate preference matching, not a verified assessment of vehicle condition.
- No official Kolesa.kz data integration is currently available in this MVP.
- Real listing access will be implemented only through an approved and documented integration.

## Roadmap

- [x] FastAPI backend and REST endpoints
- [x] PostgreSQL listing storage
- [x] SQLAlchemy models and Alembic migrations
- [x] Initial recommendation scoring algorithm
- [x] React + TypeScript frontend
- [x] Automated backend tests
- [x] Initial production frontend build
- [ ] GitHub Actions CI workflow
- [ ] Deployment of a public demo
- [ ] Official listing data integration, subject to authorization
- [ ] Improved recommendation evaluation and user feedback

## Disclaimer

CarMatch KZ is an independent development project and is not affiliated with Kolesa Group. All current vehicle listings are synthetic and intended for software testing and demonstration.
