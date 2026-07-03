import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface OrganizationAttributes {
  id: string;
  name: string;
  domain?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrganizationCreationAttributes extends Optional<
  OrganizationAttributes,
  "id" | "domain"
> {}

export class Organization
  extends Model<OrganizationAttributes, OrganizationCreationAttributes>
  implements OrganizationAttributes
{
  declare id: string;
  declare name: string;
  declare domain: string | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof Organization {
    Organization.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        domain: {
          type: DataTypes.STRING(255),
          allowNull: true,
          unique: true,
        },
      },
      {
        sequelize,
        tableName: "organizations",
        timestamps: true,
        underscored: true,
      },
    );
    return Organization;
  }
}
