-- Easy Setup Script - Import this file directly
-- Default Admin Login: admin / admin123

-- Create Database
CREATE DATABASE IF NOT EXISTS powerloom_db;
USE powerloom_db;

-- Drop existing tables (if any)
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS beam_starts;
DROP TABLE IF EXISTS machines;
DROP TABLE IF EXISTS design_presets;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS workshops;
DROP TABLE IF EXISTS customers;

-- 1. Customers Table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Workshops Table
CREATE TABLE workshops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    machine_count INT NOT NULL,
    workshop_type ENUM('veshti', 'saree', 'mixed') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Machines Table
CREATE TABLE machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workshop_id INT NOT NULL,
    machine_number INT NOT NULL,
    fabric_type ENUM('veshti', 'saree') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
    UNIQUE KEY unique_machine (workshop_id, machine_number)
);

-- 4. Design Presets Table
CREATE TABLE design_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL,
    label VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Beam Starts Table
CREATE TABLE beam_starts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    beam_number VARCHAR(50) NOT NULL UNIQUE,
    machine_id INT NOT NULL,
    workshop_id INT NOT NULL,
    customer_id INT NOT NULL,
    fabric_type ENUM('veshti', 'saree') NOT NULL,
    total_beam_meters DECIMAL(10, 2) NOT NULL,
    meters_per_piece DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('active', 'completed') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT,
    FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- 6. Deliveries Table
CREATE TABLE deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    beam_id INT NOT NULL,
    delivery_date DATE NOT NULL,
    design_name VARCHAR(100) NOT NULL,
    price_per_piece DECIMAL(10, 2) NOT NULL,
    good_pieces INT NOT NULL DEFAULT 0,
    damaged_pieces INT NOT NULL DEFAULT 0,
    meters_used DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (beam_id) REFERENCES beam_starts(id) ON DELETE CASCADE
);

-- 7. Admin Users Table
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert Default Data
INSERT INTO customers (name, contact_person, phone) VALUES 
('Customer A', 'Raja', '9876543210'),
('Customer B', 'Kumar', '9876543211'),
('Customer C', 'Selvam', '9876543212');

INSERT INTO workshops (name, location, machine_count, workshop_type) VALUES 
('Workshop 1', 'Location 1', 3, 'veshti'),
('Workshop 2', 'Location 2', 4, 'veshti'),
('Workshop 3', 'Location 3', 3, 'saree');

-- Workshop 1 - 3 Veshti Machines
INSERT INTO machines (workshop_id, machine_number, fabric_type) VALUES 
(1, 1, 'veshti'),
(1, 2, 'veshti'),
(1, 3, 'veshti');

-- Workshop 2 - 4 Veshti Machines
INSERT INTO machines (workshop_id, machine_number, fabric_type) VALUES 
(2, 1, 'veshti'),
(2, 2, 'veshti'),
(2, 3, 'veshti'),
(2, 4, 'veshti');

-- Workshop 3 - 3 Saree Machines
INSERT INTO machines (workshop_id, machine_number, fabric_type) VALUES 
(3, 1, 'saree'),
(3, 2, 'saree'),
(3, 3, 'saree');

-- Price Presets
INSERT INTO design_presets (price, label) VALUES 
(50.00, '₹50'),
(60.00, '₹60'),
(70.00, '₹70'),
(80.00, '₹80'),
(100.00, '₹100');

-- Admin User with password: admin123
-- This is a pre-hashed password using bcrypt
INSERT INTO admin_users (username, password_hash, email) VALUES 
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqNY8fK5jC', 'admin@powerloom.com');

-- Create Indexes
CREATE INDEX idx_beam_status ON beam_starts(status);
CREATE INDEX idx_beam_customer ON beam_starts(customer_id);
CREATE INDEX idx_delivery_date ON deliveries(delivery_date);
CREATE INDEX idx_machine_workshop ON machines(workshop_id);
CREATE INDEX idx_machine_customer ON machines(customer_id);

-- Success Message
SELECT 'Database setup completed successfully!' AS Status,
       'Default Login: admin / admin123' AS Credentials;