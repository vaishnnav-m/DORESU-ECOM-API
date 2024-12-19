# DORESU - E-Commerce API

This is the backend service for the DORESU e-commerce platform, built using Node.js with Express.js. It provides RESTful APIs for managing products, categories, users, orders, and more.

---

## Features

- **User Authentication**:
  - JWT-based authentication
  - OTP-based email verification
  - Role-based access (Admin/User)
- **Product Management**:
  - Add, edit, and delete products
  - Handle multiple product images
- **Category Management**:
  - Create, edit, and soft-delete categories
- **Cart Management**:
  - Add, update, and remove items
  - Real-time quantity adjustments
- **Order Management**:
  - Place, return, and cancel orders

---

## Technologies Used

- **Backend Framework**: Node.js with Express.js
- **Database**: MongoDB (with Mongoose for ORM)
- **Authentication**: JSON Web Tokens (JWT)
- **File Uploads**: Multer
- **Environment Management**: dotenv

---

## Installation and Setup

### Prerequisites

- Node.js (version >= 14.x recommended)
- MongoDB (installed locally or using a cloud provider like MongoDB Atlas)

### Clone the repository

   ```bash
   git clone https://github.com/vaishnnav-m/DORESU-ECOM-API.git