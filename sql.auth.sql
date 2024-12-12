-- Create the railway reservation database
CREATE DATABASE RailwayReservationSystem;

-- Use the database
USE RailwayReservationSystem;

-- Create the customers table
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15),
    date_of_birth DATE
);

-- Create the administrators table
CREATE TABLE administrators (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15),
    date_of_birth DATE
);
