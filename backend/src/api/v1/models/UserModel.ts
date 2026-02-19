import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { RoleModel } from './RoleModel';

// UserModel stores platform accounts; Feature 0 seeds exactly one initial admin account.
// No API endpoint is exposed in this feature, this model is consumed only by seed services.
// role_id links users to role catalog so future auth checks can enforce ADMIN-only operations.
export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> {
  declare user_id: CreationOptional<number>;
  declare role_id: number;
  declare email: string;
  declare password_hash: string;
  declare created_at: CreationOptional<Date>;
}

// We enforce a basic email format at model-level to catch invalid seed configuration early.
UserModel.init(
  {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'role_id'
      }
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: false
  }
);

// Association is registered at import-time so seed service can include role details when validating output.
UserModel.belongsTo(RoleModel, {
  foreignKey: 'role_id',
  as: 'role'
});
