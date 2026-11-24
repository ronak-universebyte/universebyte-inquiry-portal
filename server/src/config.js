// import dotenv from 'dotenv';
// dotenv.config();

// export const config = {
//   port: process.env.PORT || 5000,
//   jwtSecret: process.env.JWT_SECRET || 'universebyte-inquiry-secret-key-2026',
//   jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
// };

import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
