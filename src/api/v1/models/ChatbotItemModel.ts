import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { BbEntityModel } from './BbEntityModel';
import { ChatbotModel } from './ChatbotModel';

// ChatbotItemModel indexes which entities belong to which chatbot tenant.
// It is the bridge that allows one chatbot to own many CONTACT/SCHEDULE entities over time.
// Feature 4 relies on this table for ownership checks and schedule/contact retrieval joins.
// Unique(chatbot_id, entity_id) is enforced in DB, preventing duplicate item links.
export class ChatbotItemModel extends Model<InferAttributes<ChatbotItemModel>, InferCreationAttributes<ChatbotItemModel>> {
  declare item_id: CreationOptional<number>;
  declare chatbot_id: number;
  declare entity_id: number;
  declare created_at: CreationOptional<Date>;
}

// Model mapping for chatbot_items keeps explicit reference metadata for MySQL integrity.
ChatbotItemModel.init(
  {
    item_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    chatbot_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'chatbots',
        key: 'chatbot_id'
      }
    },
    entity_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'bb_entities',
        key: 'entity_id'
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
    tableName: 'chatbot_items',
    timestamps: false
  }
);

// Associations support include-based ownership and entity-type checks in service methods.
ChatbotItemModel.belongsTo(ChatbotModel, { foreignKey: 'chatbot_id', as: 'chatbot' });
ChatbotItemModel.belongsTo(BbEntityModel, { foreignKey: 'entity_id', as: 'entity' });
