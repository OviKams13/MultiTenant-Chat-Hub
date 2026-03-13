import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { UserModel } from './UserModel';

// ChatbotModel stores tenant chatbot records owned by authenticated ADMIN users.
// Domain is globally unique because each deployed chatbot is mounted on a unique public address.
// created_by tracks the actor who provisioned the chatbot for future audit history features.
export class ChatbotModel extends Model<InferAttributes<ChatbotModel>, InferCreationAttributes<ChatbotModel>> {
  declare chatbot_id: CreationOptional<number>;
  declare user_id: number;
  declare domain: string;
  declare display_name: string;
  declare created_at: CreationOptional<Date>;
  declare created_by: number;
}

// The model reflects the existing MySQL chatbots table and enforces key data constraints.
ChatbotModel.init(
  {
    chatbot_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'chatbots',
    timestamps: false
  }
);

// Associations are registered once to support tenant owner filtering in chatbot services.
ChatbotModel.belongsTo(UserModel, { foreignKey: 'user_id', as: 'owner' });
UserModel.hasMany(ChatbotModel, { foreignKey: 'user_id', as: 'chatbots' });
