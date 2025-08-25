# ZeroScope
Capstone Project

## Steps to run the project on your local device:

### **Prerequisites**
Ensure you have installed:
   - **Docker** and **Docker Compose** ([Install Docker](https://docs.docker.com/get-docker/))
   - **Node.js** and **npm** (for frontend)
   - **Git** (optional, for cloning)

---

### **Step 1: Clone the Project (if using Git)**
```bash
git clone <your-repository-url>
cd your-project-name
```

---

## Backend Setup (Dockerized)

### **Step 2: Configure Environment Variables**
- Copy `.env.example` to `.env` in the `backend` folder and update values as needed.
- Example:
  ```env
  SECRET_KEY=your_secret_key
  DEBUG=True
  DB_NAME=database
  DB_PASSWORD=your_db_password
  ```

### **Step 3: Start Backend Services**
```bash
cd backend
docker-compose up --build
```
- This will start both the Django backend and PostgreSQL database in containers.
- Access the backend at [http://localhost:8000](http://localhost:8000).

---

## Frontend Setup

### **Step 4: Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

### **Step 5: Start the Frontend Development Server**
```bash
npm run dev
```
- Access the frontend at [http://localhost:5173](http://localhost:5173).

---

## Notes

- Make sure Docker is running before starting backend services.
- The backend and database are fully containerized; no need to install Python or PostgreSQL locally.
- The frontend runs outside Docker and connects to the backend via API endpoints.

- If model fields are updated, run `docker-compose run --rm django sh -c "pip install -r requirements.txt && python manage.py makemigrations"` instead before running with `docker-compose up`

---