# ZeroScope
Capstone Project

## Steps to run the project on your local device:

### **Prerequisites**
1. Ensure you have installed:
   - **Python** (3.8+ recommended)
   - **PostgreSQL** (install from [postgresql.org](https://www.postgresql.org/download/))
   - **Git** (optional, for cloning)

---

### **Step 1: Clone the Project (if using Git)**
```bash
git clone <your-repository-url>
cd your-project-name
```

---

### **Step 2: Set Up a Virtual Environment**
```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # Linux/Mac
.\venv\Scripts\activate        # Windows
```

---

### **Step 3: Install Dependencies**
```bash
pip install -r requirements.txt
```

---

### **Step 4: Set Up PostgreSQL**
1. **Create a PostgreSQL database**:
   - Open `psql` (PostgreSQL CLI) or use a tool like **pgAdmin**.
   - Run:
     ```sql
     CREATE DATABASE your_db_name;
     CREATE USER your_db_user WITH PASSWORD 'your_db_password';
     GRANT ALL PRIVILEGES ON DATABASE your_db_name TO your_db_user;
     ```

2. **Update `.env`, using `.env.example` as a template**:
   ```env
   DB_NAME=your_db_name
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

---

### **Step 5: Run Migrations**
```bash
python manage.py migrate
```

---

### **Step 6: Start the Development Server**
```bash
python manage.py runserver
```
Visit `http://127.0.0.1:8000` in your browser!

---