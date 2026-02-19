import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';

// BbEntityModel is the parent record for both static and dynamic chatbot blocks.
// Feature 4 writes static entities with entity_type CONTACT/SCHEDULE and no type_id/data.
// This parent-first design keeps item indexing and tagging generic across block families.
// Strict typing here prevents accidental writes that violate the hybrid schema contract.
export class BbEntityModel extends Model<InferAttributes<BbEntityModel>, InferCreationAttributes<BbEntityModel>> {
  declare entity_id: CreationOptional<number>;
  declare entity_type: string | null;
  declare type_id: number | null;
  declare data: Record<string, unknown> | null;
  declare created_at: CreationOptional<Date>;
}

// Initialization mirrors bb_entities DDL used by static and dynamic block flows.
BbEntityModel.init(
  {
    entity_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    type_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    data: {
      type: DataTypes.JSON,
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
    tableName: 'bb_entities',
    timestamps: false
  }
);
