import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { BbEntityModel } from './BbEntityModel';

// BbScheduleModel stores one schedule slot per entity_id parent in bb_entities.
// Multiple schedule rows are supported at chatbot level via chatbot_items linking.
// Time columns use SQL TIME and are exposed as strings in the API DTO contract.
// This model intentionally avoids chatbot ownership logic; service layer enforces tenancy.
export class BbScheduleModel extends Model<InferAttributes<BbScheduleModel>, InferCreationAttributes<BbScheduleModel>> {
  declare entity_id: number;
  declare title: string;
  declare day_of_week: string;
  declare open_time: string;
  declare close_time: string;
  declare notes: string | null;
}

// Initialization follows bb_schedules schema consumed by schedule CRUD endpoints.
BbScheduleModel.init(
  {
    entity_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: 'bb_entities',
        key: 'entity_id'
      }
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    day_of_week: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    open_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    close_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'bb_schedules',
    timestamps: false
  }
);

// Association enables joined schedule reads through parent entity records.
BbScheduleModel.belongsTo(BbEntityModel, { foreignKey: 'entity_id', as: 'entity' });
