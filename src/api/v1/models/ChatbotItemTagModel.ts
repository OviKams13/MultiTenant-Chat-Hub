import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { ChatbotItemModel } from './ChatbotItemModel';
import { TagModel } from './TagModel';

// ChatbotItemTagModel maps item-to-tag many-to-many relationships for runtime retrieval.
// Feature 4 auto-populates these rows with default system tags after block creation.
// Composite primary key avoids duplicate tag assignments on the same chatbot item.
// This model remains minimal because business rules live in TagService/StaticBlockService.
export class ChatbotItemTagModel extends Model<InferAttributes<ChatbotItemTagModel>, InferCreationAttributes<ChatbotItemTagModel>> {
  declare item_id: number;
  declare tag_id: number;
}

// Mapping follows chatbot_item_tags schema with composite PK (item_id, tag_id).
ChatbotItemTagModel.init(
  {
    item_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: 'chatbot_items',
        key: 'item_id'
      }
    },
    tag_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: 'tags',
        key: 'tag_id'
      }
    }
  },
  {
    sequelize,
    tableName: 'chatbot_item_tags',
    timestamps: false
  }
);

// Associations support relational cleanup and optional includes when debugging tag links.
ChatbotItemTagModel.belongsTo(ChatbotItemModel, { foreignKey: 'item_id', as: 'item' });
ChatbotItemTagModel.belongsTo(TagModel, { foreignKey: 'tag_id', as: 'tag' });
