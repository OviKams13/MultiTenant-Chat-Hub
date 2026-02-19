import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';

// TagModel persists both seeded system tags and admin-created custom tags.
// tag_code remains globally unique to prevent ambiguous tag semantics across chatbot features.
// synonyms_json is stored in JSON for multilingual runtime matching and builder UX hints.
export class TagModel extends Model<InferAttributes<TagModel>, InferCreationAttributes<TagModel>> {
  declare tag_id: CreationOptional<number>;
  declare tag_code: string;
  declare description: string | null;
  declare category: string | null;
  declare is_system: boolean;
  declare synonyms_json: string[] | null;
}

// Model initialization mirrors current MySQL DDL while staying compatible with strict TypeScript mode.
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
