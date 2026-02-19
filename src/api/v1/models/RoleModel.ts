import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';

// RoleModel maps the roles table used as the root authorization catalog for the platform.
// We keep this model isolated because Feature 0 provides bootstrap data and no public endpoints.
// In future login flows, ADMIN role will gate access to tenant configuration interfaces.
export class RoleModel extends Model<InferAttributes<RoleModel>, InferCreationAttributes<RoleModel>> {
  declare role_id: CreationOptional<number>;
  declare role_name: string;
  declare description: string | null;
  declare created_at: CreationOptional<Date>;
}

// Explicit initialization keeps strict typing clear and avoids relying on Sequelize CLI-generated artifacts.
RoleModel.init(
  {
    role_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    role_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isUppercase: true
      }
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'roles',
    timestamps: false
  }
);
