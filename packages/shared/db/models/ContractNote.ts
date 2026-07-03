import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface ContractNoteAttributes {
  id: string;
  contractId: string;
  authorUserId?: string;
  parentNoteId?: string;
  body: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContractNoteCreationAttributes extends Optional<
  ContractNoteAttributes,
  "id" | "authorUserId" | "parentNoteId"
> {}

export class ContractNote
  extends Model<ContractNoteAttributes, ContractNoteCreationAttributes>
  implements ContractNoteAttributes
{
  declare id: string;
  declare contractId: string;
  declare authorUserId: string | undefined;
  declare parentNoteId: string | undefined;
  declare body: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof ContractNote {
    ContractNote.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        contractId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "contracts", key: "id" },
          onDelete: "CASCADE",
        },
        authorUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        parentNoteId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "contract_notes", key: "id" },
          onDelete: "CASCADE",
        },
        body: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "contract_notes",
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ["contract_id"] },
          { fields: ["parent_note_id"] },
        ],
      },
    );
    return ContractNote;
  }
}
