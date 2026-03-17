import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { ChatbotModel } from './ChatbotModel';

export class ChatbotAllowedOriginModel extends Model<
  InferAttributes<ChatbotAllowedOriginModel>,
  InferCreationAttributes<ChatbotAllowedOriginModel>
> {
  declare allowed_origin_id: CreationOptional<number>;
  declare chatbot_id: number;
  declare origin: string;
  declare created_at: CreationOptional<Date>;
}

ChatbotAllowedOriginModel.init(
  {
    allowed_origin_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    chatbot_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'chatbots',
        key: 'chatbot_id',
      },
    },
    origin: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'chatbot_allowed_origins',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['chatbot_id', 'origin'],
      },
    ],
  },
);

ChatbotAllowedOriginModel.belongsTo(ChatbotModel, {
  foreignKey: 'chatbot_id',
  as: 'chatbot',
});

ChatbotModel.hasMany(ChatbotAllowedOriginModel, {
  foreignKey: 'chatbot_id',
  as: 'allowedOrigins',
});
