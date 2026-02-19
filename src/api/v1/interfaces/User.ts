// ApiUserProfile defines the user shape returned by Auth endpoints to frontend clients.
// It intentionally excludes password hashes because credentials must never leave backend services.
// Role is represented by role name to simplify authorization checks in the admin interface.
// This DTO is used by AuthService responses and remains stable even if DB schema evolves later.
export interface ApiUserProfile {
  id: number;
  email: string;
  role: string;
  createdAt: Date;
}

// AuthResultPayload captures the success payload for register/login operations.
export interface AuthResultPayload {
  user: ApiUserProfile;
  token: string;
}
