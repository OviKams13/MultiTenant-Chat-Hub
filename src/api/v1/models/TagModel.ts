import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';

// TagModel contains semantic system tags used by chatbot runtime to map user intents to stored data.
// Feature 0 inserts a baseline catalog so every tenant starts with shared vocabulary.
// There is no REST API here; tags are bootstrapped through a CLI script only.
export class TagModel extends Model<InferAttributes<TagModel>, InferCreationAttributes<TagModel>> {
  declare tag_id: CreationOptional<number>;
  declare tag_code: string;
  declare description: string | null;
  declare category: string | null;
  declare is_system: boolean;
  declare synonyms_json: string[] | null;
}

// synonyms_json uses JSON type in MySQL to keep multilingual synonyms structured for NLP matching later.
TagModel.init(
  {
    tag_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    tag_code: {
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
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    synonyms_json: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'tags',
    timestamps: false
  }
);
