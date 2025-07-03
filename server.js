const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed!'), false);
    }
  }
});

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '45107', // Change this to your MySQL password
  database: 'user_management'
};

// Create database connection
let db;

async function initDatabase() {
  try {
    // Create connection without database first
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    // Connect to the database
    db = await mysql.createConnection(dbConfig);
    
    // Create users table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone_number VARCHAR(10) NOT NULL,
        pan_number VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

const validatePAN = (pan) => {
  const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
  return panRegex.test(pan);
};

const validateUser = (user) => {
  const errors = [];

  if (!user.first_name || user.first_name.trim() === '') {
    errors.push('First name is required');
  }

  if (!user.last_name || user.last_name.trim() === '') {
    errors.push('Last name is required');
  }

  if (!user.email || user.email.trim() === '') {
    errors.push('Email is required');
  } else if (!validateEmail(user.email)) {
    errors.push('Invalid email format');
  }

  if (!user.phone_number || user.phone_number.trim() === '') {
    errors.push('Phone number is required');
  } else if (!validatePhone(user.phone_number)) {
    errors.push('Phone number must be 10 digits');
  }

  if (!user.pan_number || user.pan_number.trim() === '') {
    errors.push('PAN number is required');
  } else if (!validatePAN(user.pan_number.toUpperCase())) {
    errors.push('PAN number must be in format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)');
  }

  return errors;
};

// Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Download all users as Excel template
app.get('/api/users/template', async (req, res) => {
  console.log('HIT /api/users/template route'); // <-- Log for debugging
  try {
    if (!db) {
      console.error('Database connection not initialized');
      return res.status(500).json({ error: 'Database not initialized' });
    }
    // Always generate a template, even if there are no users
    const [rows] = await db.execute('SELECT first_name AS "First Name", last_name AS "Last Name", email AS "Email", phone_number AS "Phone Number", pan_number AS "PAN Number" FROM users ORDER BY created_at DESC');
    // If there are no users, just use an empty row for the template
    const data = rows.length ? rows : [{
      'First Name': '',
      'Last Name': '',
      'Email': '',
      'Phone Number': '',
      'PAN Number': ''
    }];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=user_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating users template:', error);
    res.status(500).json({ error: 'Failed to generate users template', details: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const userData = {
      first_name: req.body.first_name?.trim(),
      last_name: req.body.last_name?.trim(),
      email: req.body.email?.trim().toLowerCase(),
      phone_number: req.body.phone_number?.trim(),
      pan_number: req.body.pan_number?.trim().toUpperCase()
    };

    const validationErrors = validateUser(userData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const [result] = await db.execute(
      'INSERT INTO users (first_name, last_name, email, phone_number, pan_number) VALUES (?, ?, ?, ?, ?)',
      [userData.first_name, userData.last_name, userData.email, userData.phone_number, userData.pan_number]
    );

    const [newUser] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'User created successfully', user: newUser[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ errors: ['Email already exists'] });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const userData = {
      first_name: req.body.first_name?.trim(),
      last_name: req.body.last_name?.trim(),
      email: req.body.email?.trim().toLowerCase(),
      phone_number: req.body.phone_number?.trim(),
      pan_number: req.body.pan_number?.trim().toUpperCase()
    };

    const validationErrors = validateUser(userData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const [result] = await db.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone_number = ?, pan_number = ? WHERE id = ?',
      [userData.first_name, userData.last_name, userData.email, userData.phone_number, userData.pan_number, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [updatedUser] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User updated successfully', user: updatedUser[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ errors: ['Email already exists'] });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Bulk upload users from Excel
app.post('/api/users/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'File is empty or invalid format' });
    }

    const errors = [];
    const validUsers = [];

    // Validate each row
    data.forEach((row, index) => {
      const rowNumber = index + 2; // Excel row number (accounting for header)
      const user = {
        first_name: row['First Name']?.toString().trim() || '',
        last_name: row['Last Name']?.toString().trim() || '',
        email: row['Email']?.toString().trim().toLowerCase() || '',
        phone_number: row['Phone Number']?.toString().trim() || '',
        pan_number: row['PAN Number']?.toString().trim().toUpperCase() || ''
      };

      const validationErrors = validateUser(user);
      if (validationErrors.length > 0) {
        errors.push({
          row: rowNumber,
          errors: validationErrors
        });
      } else {
        validUsers.push(user);
      }
    });

    // If there are validation errors, don't save any data
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation errors found in uploaded file',
        details: errors
      });
    }

    // Check for duplicate emails in the file itself
    const emailSet = new Set();
    const duplicateEmails = [];
    validUsers.forEach((user, index) => {
      if (emailSet.has(user.email)) {
        duplicateEmails.push({ row: index + 2, email: user.email });
      } else {
        emailSet.add(user.email);
      }
    });

    if (duplicateEmails.length > 0) {
      return res.status(400).json({
        error: 'Duplicate emails found in file',
        details: duplicateEmails
      });
    }

    // Insert all valid users
    const insertPromises = validUsers.map(user => 
      db.execute(
        'INSERT INTO users (first_name, last_name, email, phone_number, pan_number) VALUES (?, ?, ?, ?, ?)',
        [user.first_name, user.last_name, user.email, user.phone_number, user.pan_number]
      )
    );

    await Promise.all(insertPromises);

    res.json({ 
      message: `Successfully uploaded ${validUsers.length} users`,
      count: validUsers.length
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'One or more emails already exist in the database' });
    } else {
      res.status(500).json({ error: 'Failed to upload users' });
    }
  }
});

// Download sample Excel template
app.get('/api/sample-template', (req, res) => {
  try {
    const sampleData = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Email': 'john.doe@example.com',
        'Phone Number': '9876543210',
        'PAN Number': 'ABCDE1234F'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=user_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  if (error.message === 'Only .xlsx files are allowed!') {
    return res.status(400).json({ error: 'Only .xlsx files are allowed' });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();