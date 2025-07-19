// lib/jwt.ts
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "secret-dev-key"

export function signJwt(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (err) {
    return null
  }
}
