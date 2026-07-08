import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export type ContractStatus = "draft" | "active" | "expired" | "terminated";

export interface ContractAttributes {
  id: string;
  organizationId: string;
  uploadedByUserId?: string;
  title: string;
  counterparty: string;
  contractType: string;
  status: ContractStatus;
  effectiveDate?: Date;
  expirationDate?: Date;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContractCreationAttributes extends Optional<
  ContractAttributes,
  | "id"
  | "uploadedByUserId"
  | "status"
  | "effectiveDate"
  | "expirationDate"
  | "fileKey"
  | "fileName"
  | "fileSize"
  | "fileMimeType"
  | "tags"
> {}

export class Contract
  extends Model<ContractAttributes, ContractCreationAttributes>
  implements ContractAttributes
{
  declare id: string;
  declare organizationId: string;
  declare uploadedByUserId: string | undefined;
  declare title: string;
  declare counterparty: string;
  declare contractType: string;
  declare status: ContractStatus;
  declare effectiveDate: Date | undefined;
  declare expirationDate: Date | undefined;
  declare fileKey: string | undefined;
  declare fileName: string | undefined;
  declare fileSize: number | undefined;
  declare fileMimeType: string | undefined;
  declare tags: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Contract {
    Contract.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        organizationId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "organizations", key: "id" },
          onDelete: "CASCADE",
        },
        uploadedByUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        counterparty: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        contractType: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("draft", "active", "expired", "terminated"),
          defaultValue: "draft",
          allowNull: false,
        },
        effectiveDate: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        expirationDate: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        fileKey: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        fileName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        fileSize: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        fileMimeType: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        tags: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
      },
      {
        sequelize,
        tableName: "contracts",
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ["organization_id"] },
          { fields: ["status"] },
          { fields: ["uploaded_by_user_id"] },
        ],
      },
    );
    return Contract;
  }
}
