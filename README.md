# User Management System

A full-stack application for managing users with bulk upload and download features using Excel files.

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Frontend:** React.js (with Tailwind CSS)
- **File Upload/Parsing:** Multer, xlsx
- **Other:** CORS, dotenv (if used for environment variables)

## Setup Instructions

### Prerequisites
- Node.js (v14 or above)
- npm (Node Package Manager)
- MySQL Server

### 1. Clone the Repository
```
git clone <repo-url>
cd User_Management
```

### 2. Install Backend Dependencies
```
npm install
```

### 3. Configure MySQL Database
- Ensure MySQL is running on your system.
- Update the MySQL credentials in `server.js` if needed:
  - `host`, `user`, `password`, `database`
- The server will automatically create the `user_management` database and `users` table if they do not exist.
- You can also run `database-setup.sql` manually if you prefer.

### 4. Start the Backend Server
```
npm start
```
- The server will run on port 5000 by default (or as set in the `PORT` environment variable).

### 5. Setup and Run the Frontend
```
cd frontend
npm install
npm start
```
- The frontend will typically run on port 3000.

## How to Run Locally
1. Start MySQL server.
2. Start the backend server as described above.
3. Start the frontend React app.
4. Access the frontend at [http://localhost:3000](http://localhost:3000).

## Features
- Add, update, delete, and view users.
- Bulk upload users via Excel (.xlsx) file.
- Download user data or a sample Excel template.
- Data validation for email, phone, and PAN number.

## Assumptions
- PAN number format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g., ABCDE1234F).
- Phone number: 10 digits.
- Email: must be unique and valid.
- Only `.xlsx` files are accepted for bulk upload.

## Known Issues
- No known issues at this time.

## Notes
- If you encounter a port conflict, change the `PORT` in the environment or in the code.
- For production, use environment variables for sensitive data (e.g., database credentials).
- Error messages are returned in JSON format for API endpoints.


