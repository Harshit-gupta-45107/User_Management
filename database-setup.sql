CREATE DATABASE IF NOT EXISTS user_management;

USE user_management;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(10) NOT NULL,
    pan_number VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_created_at ON users(created_at);

-- Insert sample data (optional)
INSERT INTO users (first_name, last_name, email, phone_number, pan_number) VALUES
('Harshit', 'Gupta', 'harshit.gupta@example.com', '9876543210', 'ABCDE1234F'),
('Kartik', 'Gupta', 'kartik.gupta@example.com', '8765432109', 'FGHIJ5678K'),
('Mike', 'Johnson', 'mike.johnson@example.com', '7654321098', 'LMNOP9012Q');
