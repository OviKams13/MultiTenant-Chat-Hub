import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../../../config/DatabaseConfig';
import { BbEntityModel } from './BbEntityModel';

// BbContactModel stores static contact fields while reusing entity_id from bb_entities.
// One bb_contacts row maps to exactly one CONTACT entity parent in Feature 4.
// Nullable optional fields keep onboarding flexible while org_name remains mandatory.
// The model is intentionally flat to match admin form fields and simplify DTO mapping.
export class BbContactModel extends Model<InferAttributes<BbContactModel>, InferCreationAttributes<BbContactModel>> {
  declare entity_id: number;
  declare org_name: string;
  declare phone: string | null;
  declare email: string | null;
  declare address_text: string | null;
  declare city: string | null;
  declare country: string | null;
  declare hours_text: string | null;
}

// Model mapping matches the bb_contacts table used by Contact block APIs.
BbContactModel.init(
  {
    entity_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      references: {
        model: 'bb_entities',
        key: 'entity_id'
      }
    },
    org_name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: true
    },
    address_text: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    hours_text: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'bb_contacts',
    timestamps: false
  }
);

// Association enables include/join reads from CONTACT entity records.
BbContactModel.belongsTo(BbEntityModel, { foreignKey: 'entity_id', as: 'entity' });
