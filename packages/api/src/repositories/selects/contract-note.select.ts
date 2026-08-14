import { Prisma } from "@prisma/client";

export const CONTRACT_NOTE_SELECT = {
  id: true,
  contractId: true,
  content: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      fullName: true,
    },
  },
} satisfies Prisma.ContractNoteSelect;
