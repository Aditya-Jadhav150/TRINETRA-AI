# TRINETRA AI – State-of-the-Art Law Enforcement Intelligence & Analytics Platform

TRINETRA AI is a premium enterprise-grade web application designed for law enforcement agencies to perform advanced crime analytics, network-analysis profiling, offender relationship tracing, and legal document semantic searches. 

The platform supports dynamic, full-application localization (English / Kannada) and operates on a serverless, decoupled cloud database architecture for high-performance scale and fast deployments.

---

## 🚀 Key Features

### 1. Interactive Knowledge Graph (Network Analysis)
- **Multi-Hop Exploration**: Toggle between 1-Hop, 2-Hop, and Full Network layouts around a focus suspect.
- **Adaptive Zoom Visibility**:
  - *Far Zoom*: Displays colors and semantic entity icons only (wanted suspects, cases, stations, officers).
  - *Medium Zoom*: Renders truncated entity labels.
  - *Close Zoom*: Reveals high-density names, ranks, and legal sections.
- **Contextual Relationship Lines**: Edge relation names are hidden by default and transition into view on mouse-hover, selection, shortest path queries, or toolbar override.
- **Pathfinder Animation**: Highlight shortest path relations between suspects with flowing dashed animations.
- **Sliding Dossier Panel**: Click a node to open a slide-in right drawer housing profile histories, active cases, evidence logs, and legal codes.
- **Node Clustering**: Automatically collapses unexpanded categories in Full view to prevent visual density overload.
- **Right-Click Context Menu**: Instantly center viewports, expand hops, collapse categories, mark path endpoints, or copy node IDs.

### 2. Multi-Dimensional Crime Analytics
- **Growth Curves**: Recharts monthly area graphs mapping seasonal crime trends.
- **Volume Metrics**: Bar charts displaying crime types.
- **Resolution Ranks**: Active tables ranking officers by handle counts, filed chargesheets, and resolution percentages.

### 3. Offender Profiling & Case Similarity
- **Threat Assessments**: Radar grids analyzing offender threat vectors.
- **Case Similarity matcher**: Vector-embedding comparisons (Cosine distance) to locate resembling patterns in legacy cases.

### 4. Legal RAG (Retrieval-Augmented Generation) Knowledge Base
- Upload and index case briefs or law code sheets into Qdrant Cloud.
- Retrieve semantically matched document snippets for instant legal lookup.

---

## 🛠️ Technology Stack

- **Frontend**: React (v18), Vite, React Flow, Recharts, Tailwind CSS, Lucide Icons, React Leaflet.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy 2.0.
- **Databases (Cloud Serverless)**:
  - **PostgreSQL**: Supabase (Session Pooler).
  - **Graph Store**: Neo4j AuraDB.
  - **Vector Database**: Qdrant Cloud.
  - **Caching / Session storage**: Upstash Redis (Secure TLS).

---

## 📦 Local Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database initialization and seeding:
   ```bash
   python -c "from app.seed import seed_database; seed_database()"
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd ../client
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🛡️ Security & Environment Settings
All environment variables and connection strings (Supabase PostgreSQL, Neo4j Aura, Qdrant Cloud, Upstash Redis) are stored inside the `backend/.env` file. These configurations are ignored from source control by the root `.gitignore` to prevent any accidental credential leaks.
