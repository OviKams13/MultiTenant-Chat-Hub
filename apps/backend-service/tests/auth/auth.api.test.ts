// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

import { app } from '../../src/index';
import { AuthService } from '../../src/api/v1/services/AuthService';
import * as jwtHelper from '../../src/api/v1/helpers/jwt';
import { AppError } from '../../src/api/v1/errors/AppError';

// API integration-like tests spin up the Express app and exercise real HTTP endpoints.
// Service methods are monkey-patched per test to isolate routing/controller behavior from the database.
// This keeps response contract checks stable while remaining runnable in restricted environments.
// Tests focus on status codes and standardized { success, data, error } envelope integrity.
const originalRegister = AuthService.prototype.registerAdmin;
const originalLogin = AuthService.prototype.login;
const originalGetAuthenticatedUser = AuthService.prototype.getAuthenticatedUser;
const originalVerify = jwtHelper.verifyToken;

function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('POST /api/v1/auth/register returns 201 with user and token', async () => {
  AuthService.prototype.registerAdmin = async () => ({
    user: { id: 1, email: 'owner@example.com', role: 'ADMIN', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    token: 'token-value'
  });

  const server = await startTestServer();
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', password: 'StrongPass123!' })
  });

  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.token, 'token-value');

  server.close();
  AuthService.prototype.registerAdmin = originalRegister;
});

test('POST /api/v1/auth/login returns 401 for invalid credentials', async () => {
  AuthService.prototype.login = async () => {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  };

  const server = await startTestServer();
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', password: 'WrongPass123!' })
  });

  assert.equal(response.status, 401);
  server.close();
  AuthService.prototype.login = originalLogin;
});

test('GET /api/v1/auth/me returns 200 with valid token', async () => {
  jwtHelper.verifyToken = () => ({ userId: 9, email: 'owner@example.com', role: 'ADMIN' });
  AuthService.prototype.getAuthenticatedUser = async () => ({
    id: 9,
    email: 'owner@example.com',
    role: 'ADMIN',
    createdAt: new Date('2026-01-01T00:00:00.000Z')
  });

  const server = await startTestServer();
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/me`, {
    method: 'GET',
    headers: { authorization: 'Bearer token-value' }
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.email, 'owner@example.com');

  server.close();
  AuthService.prototype.getAuthenticatedUser = originalGetAuthenticatedUser;
  jwtHelper.verifyToken = originalVerify;
});
