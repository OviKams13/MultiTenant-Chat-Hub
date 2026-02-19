// User interface describes a platform user record persisted in users table.
// During Feature 0 we only create the initial admin account used to access back-office tools later.
// The password field stores a hash, never a plain value, to avoid credential leakage.
// Additional profile/authentication fields can be added in future features without changing seed flow intent.
export interface User {
  user_id: number;
  role_id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

// This type is used for the minimum payload required to create the seeded admin account.
export type UserCreation = Omit<User, 'user_id' | 'created_at'>;
