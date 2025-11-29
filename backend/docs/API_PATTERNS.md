# API Request/Response Patterns

## Overview

This document describes the common patterns used throughout the Vinyl Catalog API for request/response formatting, error handling, and authentication.

## Response Format

All API responses follow a consistent JSON format with a `success` boolean and optional `data` or `error` fields.

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field": "value"
  },
  "requestId": "uuid"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "requestId": "uuid"
}
```

## HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded but no content to return
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Authenticated user lacks required permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

## Authentication

### Access Token (JWT)

Access tokens are short-lived JWT tokens (15 minutes) that authenticate requests.

**Header:** `Authorization: Bearer <access_token>`

**Token Claims:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "BUYER",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Refresh Token (JWT)

Refresh tokens are long-lived JWT tokens (7 days) used to obtain new access tokens.

**Request:**
```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

## Pagination

List endpoints support pagination with `limit` and `offset` query parameters.

**Query Parameters:**
- `limit` (number, default: 20) - Maximum number of results to return
- `offset` (number, default: 0) - Number of results to skip

**Example Request:**
```bash
GET /api/v1/catalog?limit=10&offset=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [],
    "limit": 10,
    "offset": 20,
    "total": 100
  }
}
```

## Search

Search endpoints accept a `q` query parameter for search queries.

**Query Parameters:**
- `q` (string) - Search query (title, artist, etc.)

**Example Request:**
```bash
GET /api/v1/catalog/search?q=pink+floyd
```

## Error Codes

Common error codes returned by the API:

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Authentication failed
- `AUTHORIZATION_ERROR` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `DUPLICATE_RESOURCE` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_ERROR` - Unexpected server error

## Request Body Validation

Request bodies are validated using express-validator. Common validation errors include:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

## Password Requirements

Passwords must meet the following requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&* etc.)

## User Roles

Three user roles are defined:

- `BUYER` - Can browse catalog and place orders
- `SELLER` - Can manage submissions and pricing
- `ADMIN` - Full system access

## Common Request/Response Examples

### Register User

**Request:**
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "role": "BUYER"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "BUYER",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Login User

**Request:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "BUYER"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Get Catalog

**Request:**
```bash
GET /api/v1/catalog?limit=20&offset=0
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Dark Side of the Moon",
        "artist": "Pink Floyd",
        "releaseYear": 1973,
        "format": "LP",
        "condition": "NEAR_MINT",
        "price": 45.99
      }
    ],
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}
```

### Search Catalog

**Request:**
```bash
GET /api/v1/catalog/search?q=pink+floyd
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "The Wall",
        "artist": "Pink Floyd",
        "releaseYear": 1979,
        "format": "2xLP",
        "condition": "VERY_GOOD",
        "price": 55.99
      }
    ],
    "query": "pink floyd",
    "resultCount": 1
  }
}
```

### Create Release

**Request:**
```bash
POST /api/v1/catalog
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Wish You Were Here",
  "artist": "Pink Floyd",
  "releaseYear": 1975,
  "format": "LP",
  "condition": "MINT",
  "price": 65.99,
  "description": "Original pressing in mint condition"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Wish You Were Here",
    "artist": "Pink Floyd",
    "releaseYear": 1975,
    "format": "LP",
    "condition": "MINT",
    "price": 65.99,
    "description": "Original pressing in mint condition",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Testing

When testing the API:

1. Use the provided test fixtures to create consistent test data
2. Always validate response structure matches expected format
3. Test both success and error paths
4. Verify status codes match documentation
5. Test with invalid data to verify error handling
6. Test rate limiting endpoints with multiple requests

### Example Test

```javascript
import request from 'supertest';
import app from '../src/index.js';
import { getTestAuthHeader } from '../tests/fixtures/tokens.js';
import { createTestCreateReleasePayload } from '../tests/fixtures/factory.js';

describe('Catalog API', () => {
  it('should create a new release', async () => {
    const authHeader = getTestAuthHeader();
    const payload = createTestCreateReleasePayload();

    const response = await request(app)
      .post('/api/v1/catalog')
      .set('Authorization', authHeader)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.title).toBe(payload.title);
  });
});
```
