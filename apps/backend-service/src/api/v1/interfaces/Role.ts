// Role interface represents the system authorization role persisted in the roles table.
// In future auth features, this role will decide what admin users can configure in their tenant.
// Feature 0 uses this contract to type the bootstrap seed pipeline with strict TypeScript checks.
// This file is intentionally kept framework-agnostic so services can depend on stable business types.
export interface Role {
  role_id: number;
  role_name: string;
  description: string | null;
  created_at: Date;
}

// This creation type models what is required when inserting a new role during seed execution.
export type RoleCreation = Omit<Role, 'role_id' | 'created_at'>;
