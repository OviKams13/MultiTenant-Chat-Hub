import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { ChatbotModel } from './ChatbotModel';

// BlockTypeModel maps dynamic block template definitions used by the chatbot form builder.
// chatbot_id is nullable to support global system templates shared across multiple chatbots.
// schema_definition stores flexible field configuration JSON validated at API boundary.
// is_system marks protected global templates that this feature exposes as read-only.
export class BlockTypeModel extends Model<InferAttributes<BlockTypeModel>, InferCreationAttributes<BlockTypeModel>> {
  declare type_id: CreationOptional<number>;
  declare chatbot_id: number | null;
  declare type_name: string;
  declare schema_definition: Record<string, unknown>;
  declare description: string | null;
  declare is_system: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
}

// Initialization mirrors bb_block_type_definitions and keeps strict typing explicit.
BlockTypeModel.init(
  {
    type_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    chatbot_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'chatbots',
        key: 'chatbot_id'
      }
    },
    type_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    schema_definition: {
      type: DataTypes.JSON,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'bb_block_type_definitions',
    timestamps: false
  }
);

// Association supports optional ownership filtering and swagger/admin debug includes.
BlockTypeModel.belongsTo(ChatbotModel, { foreignKey: 'chatbot_id', as: 'chatbot' });
