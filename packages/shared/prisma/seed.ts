import crypto from "node:crypto";
import { getPrismaClient, hashPassword } from "@starter-kit/shared";

const prisma = getPrismaClient();

// ─── Demo credentials ───────────────────────────────────────────────────
// Every seeded user shares this password so you can log in as any of them
// while testing. Never reuse this pattern outside a local/demo database.
//
//   Owner:            sarah.whitfield@ridgelinevoss.com
//   Admin:             marcus.chen@ridgelinevoss.com
//   Internal (Legal):  priya.nair@ridgelinevoss.com
//   Internal (Ops):    daniel.osei@ridgelinevoss.com
//   Password (all):    Password123!
const DEMO_PASSWORD = "Password123!";

// Fixed UUIDs for every seeded row so this script is idempotent: re-running
// it upserts the same rows to the same values instead of erroring on unique
// constraints or duplicating data.
const ORG_ID = "00000000-0000-4000-8000-000000000001";

const USER_OWNER_ID = "00000000-0000-4000-8000-000000000101";
const USER_ADMIN_ID = "00000000-0000-4000-8000-000000000102";
const USER_LEGAL_ID = "00000000-0000-4000-8000-000000000103";
const USER_OPS_ID = "00000000-0000-4000-8000-000000000104";
const USER_INVITED_ID = "00000000-0000-4000-8000-000000000105";

const INVITATION_ADMIN_ID = "00000000-0000-4000-8000-000000000201";
const INVITATION_LEGAL_ID = "00000000-0000-4000-8000-000000000202";
const INVITATION_OPS_ID = "00000000-0000-4000-8000-000000000203";
const INVITATION_PENDING_ID = "00000000-0000-4000-8000-000000000204";
const INVITATION_EXPIRED_ID = "00000000-0000-4000-8000-000000000205";
const INVITATION_REVOKED_ID = "00000000-0000-4000-8000-000000000206";

function fakeChecksum(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function tokenHash(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const DISCLAIMER =
  "DISCLAIMER: This is an AI-generated summary for informational purposes only and does not constitute legal advice.";

async function main(): Promise<void> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to run the demo seed against a production environment — " +
        "it creates users with a publicly-known password (see DEMO_PASSWORD " +
        "above). Set ALLOW_DEMO_SEED=true to explicitly allow this on a " +
        "production demo environment. Never do this against real customer data.",
    );
  }

  console.info("Seeding Clausio demo data...");

  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  // ─── Organization ─────────────────────────────────────────────────────
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: "Ridgeline & Voss LLP",
      slug: "ridgeline-voss",
      status: "ACTIVE",
      ownerAssignedAt: daysFromNow(-190),
    },
  });

  await prisma.organizationSettings.upsert({
    where: { organizationId: ORG_ID },
    update: {},
    create: {
      organizationId: ORG_ID,
      timezone: "America/New_York",
      language: "en",
      notificationPreferences: {
        expiryAlertDaysBefore: 30,
        emailDigestEnabled: true,
      },
      branding: {
        primaryColor: "#1E3A5F",
        accentColor: "#C9A227",
      },
    },
  });

  // ─── Owner (bootstrapped directly, not via an Invitation) ──────────────
  await prisma.user.upsert({
    where: { id: USER_OWNER_ID },
    update: { passwordHash: demoPasswordHash },
    create: {
      id: USER_OWNER_ID,
      organizationId: ORG_ID,
      email: "sarah.whitfield@ridgelinevoss.com",
      passwordHash: demoPasswordHash,
      fullName: "Sarah Whitfield",
      role: "OWNER",
      status: "ACTIVE",
      lastLoginAt: daysFromNow(-1),
      createdAt: daysFromNow(-190),
    },
  });

  await prisma.organization.update({
    where: { id: ORG_ID },
    data: { ownerUserId: USER_OWNER_ID },
  });

  // ─── Admin (via an accepted Invitation from the Owner) ─────────────────
  await prisma.invitation.upsert({
    where: { id: INVITATION_ADMIN_ID },
    update: {},
    create: {
      id: INVITATION_ADMIN_ID,
      organizationId: ORG_ID,
      invitedByUserId: USER_OWNER_ID,
      email: "marcus.chen@ridgelinevoss.com",
      role: "ADMIN",
      status: "ACCEPTED",
      tokenHash: tokenHash("invite-marcus-chen"),
      expiresAt: daysFromNow(-173),
      acceptedAt: daysFromNow(-178),
      createdAt: daysFromNow(-180),
    },
  });

  await prisma.user.upsert({
    where: { id: USER_ADMIN_ID },
    update: { passwordHash: demoPasswordHash },
    create: {
      id: USER_ADMIN_ID,
      organizationId: ORG_ID,
      invitationId: INVITATION_ADMIN_ID,
      email: "marcus.chen@ridgelinevoss.com",
      passwordHash: demoPasswordHash,
      fullName: "Marcus Chen",
      role: "ADMIN",
      status: "ACTIVE",
      lastLoginAt: daysFromNow(-2),
      createdAt: daysFromNow(-178),
    },
  });

  // ─── Internal Legal (via an accepted Invitation from the Owner) ────────
  await prisma.invitation.upsert({
    where: { id: INVITATION_LEGAL_ID },
    update: {},
    create: {
      id: INVITATION_LEGAL_ID,
      organizationId: ORG_ID,
      invitedByUserId: USER_OWNER_ID,
      email: "priya.nair@ridgelinevoss.com",
      role: "INTERNAL",
      status: "ACCEPTED",
      tokenHash: tokenHash("invite-priya-nair"),
      expiresAt: daysFromNow(-158),
      acceptedAt: daysFromNow(-162),
      createdAt: daysFromNow(-165),
    },
  });

  await prisma.user.upsert({
    where: { id: USER_LEGAL_ID },
    update: { passwordHash: demoPasswordHash },
    create: {
      id: USER_LEGAL_ID,
      organizationId: ORG_ID,
      invitationId: INVITATION_LEGAL_ID,
      email: "priya.nair@ridgelinevoss.com",
      passwordHash: demoPasswordHash,
      fullName: "Priya Nair",
      role: "INTERNAL",
      status: "ACTIVE",
      lastLoginAt: daysFromNow(0),
      createdAt: daysFromNow(-162),
    },
  });

  // ─── Internal Operations (via an accepted Invitation from the Admin) ──
  await prisma.invitation.upsert({
    where: { id: INVITATION_OPS_ID },
    update: {},
    create: {
      id: INVITATION_OPS_ID,
      organizationId: ORG_ID,
      invitedByUserId: USER_ADMIN_ID,
      email: "daniel.osei@ridgelinevoss.com",
      role: "INTERNAL",
      status: "ACCEPTED",
      tokenHash: tokenHash("invite-daniel-osei"),
      expiresAt: daysFromNow(-113),
      acceptedAt: daysFromNow(-117),
      createdAt: daysFromNow(-120),
    },
  });

  await prisma.user.upsert({
    where: { id: USER_OPS_ID },
    update: { passwordHash: demoPasswordHash },
    create: {
      id: USER_OPS_ID,
      organizationId: ORG_ID,
      invitationId: INVITATION_OPS_ID,
      email: "daniel.osei@ridgelinevoss.com",
      passwordHash: demoPasswordHash,
      fullName: "Daniel Osei",
      role: "INTERNAL",
      status: "ACTIVE",
      lastLoginAt: daysFromNow(-5),
      createdAt: daysFromNow(-117),
    },
  });

  // ─── Pending invitation + matching INVITED user (demonstrates the
  // in-progress invitation flow, per the DDS seed strategy) ──────────────
  await prisma.invitation.upsert({
    where: { id: INVITATION_PENDING_ID },
    update: {},
    create: {
      id: INVITATION_PENDING_ID,
      organizationId: ORG_ID,
      invitedByUserId: USER_ADMIN_ID,
      email: "jordan.blake@ridgelinevoss.com",
      role: "INTERNAL",
      status: "PENDING",
      tokenHash: tokenHash("invite-jordan-blake"),
      expiresAt: daysFromNow(5),
      createdAt: daysFromNow(-2),
    },
  });

  await prisma.user.upsert({
    where: { id: USER_INVITED_ID },
    update: { passwordHash: demoPasswordHash },
    create: {
      id: USER_INVITED_ID,
      organizationId: ORG_ID,
      invitationId: INVITATION_PENDING_ID,
      email: "jordan.blake@ridgelinevoss.com",
      passwordHash: demoPasswordHash,
      fullName: "Jordan Blake",
      role: "INTERNAL",
      status: "INVITED",
      createdAt: daysFromNow(-2),
    },
  });

  // ─── An invitation that expired unused, and one that was revoked ───────
  // Neither produced a User — the email was never accepted.
  await prisma.invitation.upsert({
    where: { id: INVITATION_EXPIRED_ID },
    update: {},
    create: {
      id: INVITATION_EXPIRED_ID,
      organizationId: ORG_ID,
      invitedByUserId: USER_ADMIN_ID,
      email: "alex.rivera@example.com",
      role: "INTERNAL",
      status: "EXPIRED",
      tokenHash: tokenHash("invite-alex-rivera"),
      expiresAt: daysFromNow(-10),
      createdAt: daysFromNow(-17),
    },
  });

  await prisma.invitation.upsert({
    where: { id: INVITATION_REVOKED_ID },
    update: {},
    create: {
      id: INVITATION_REVOKED_ID,
      organizationId: ORG_ID,
      invitedByUserId: USER_OWNER_ID,
      email: "taylor.brooks@example.com",
      role: "ADMIN",
      status: "REVOKED",
      tokenHash: tokenHash("invite-taylor-brooks"),
      expiresAt: daysFromNow(9),
      revokedAt: daysFromNow(-3),
      revokedByUserId: USER_OWNER_ID,
      createdAt: daysFromNow(-8),
    },
  });

  // ─── Contracts ──────────────────────────────────────────────────────────
  interface NoteSeed {
    id: string;
    authorId: string;
    content: string;
    createdAt: Date;
  }
  interface AnalysisSeed {
    id: string;
    type: "SUMMARY" | "RISK" | "CLAUSE_QUERY";
    status: "PENDING" | "COMPLETED" | "FAILED";
    promptUsed: string;
    result?: Record<string, unknown>;
    modelVersion?: string;
    tokensUsed?: number;
    createdAt: Date;
  }
  interface WitnessSeed {
    id: string;
    issuedByUserId: string;
    witnessEmail: string;
    witnessName?: string;
    status: "ISSUED" | "USED" | "EXPIRED" | "REVOKED";
    expiresAt: Date;
    usedAt?: Date;
    isRevoked?: boolean;
    createdAt: Date;
  }
  interface ContractSeed {
    id: string;
    slug: string;
    title: string;
    counterparty: string;
    uploadedByUserId: string;
    businessStatus: "DRAFT" | "UNDER_REVIEW" | "COMPLETED" | "ARCHIVED";
    processingStatus:
      | "PENDING_EXTRACTION"
      | "EXTRACTION_COMPLETED"
      | "EXTRACTION_FAILED"
      | "AI_PENDING"
      | "AI_COMPLETED"
      | "AI_FAILED";
    processingError?: string;
    legalState?: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";
    tags: string[];
    expirationDate?: Date;
    extractedTextPresent: boolean;
    createdAt: Date;
    deletedAt?: Date;
    notes: NoteSeed[];
    aiAnalyses: AnalysisSeed[];
    witnessInvitations: WitnessSeed[];
  }

  const CONTRACTS: ContractSeed[] = [
    {
      id: "00000000-0000-4000-8000-000000000301",
      slug: "acme-robotics-msa",
      title: "Master Services Agreement",
      counterparty: "Acme Robotics Inc.",
      uploadedByUserId: USER_LEGAL_ID,
      businessStatus: "COMPLETED",
      processingStatus: "AI_COMPLETED",
      legalState: "ACTIVE",
      tags: ["msa", "vendor", "technology"],
      expirationDate: daysFromNow(420),
      extractedTextPresent: true,
      createdAt: daysFromNow(-150),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000311",
          authorId: USER_LEGAL_ID,
          content:
            "Confirmed payment terms are net-30 from invoice date. No early-payment discount clause present.",
          createdAt: daysFromNow(-148),
        },
      ],
      aiAnalyses: [
        {
          id: "00000000-0000-4000-8000-000000000321",
          type: "SUMMARY",
          status: "COMPLETED",
          promptUsed:
            "Analyze the following contract and answer: obligations, payment terms, termination conditions.",
          result: {
            text: `Obligations: Acme Robotics Inc. will deliver hardware integration services per the attached statement of work. Payment: Net-30 from invoice date, milestone-based billing. Termination: Either party may terminate with 90 days' written notice; immediate termination permitted for material breach uncured after 30 days.\n\n${DISCLAIMER}`,
          },
          modelVersion: "gpt-4o-2024-08-06",
          tokensUsed: 1840,
          createdAt: daysFromNow(-149),
        },
        {
          id: "00000000-0000-4000-8000-000000000322",
          type: "RISK",
          status: "COMPLETED",
          promptUsed:
            "Scan this contract for auto-renewal, uncapped liability, indemnification, IP assignment, non-compete, and clawback risks.",
          result: {
            text: `Auto-renewal: Contract auto-renews annually unless either party gives 90 days' notice — MEDIUM severity, easy to miss. Liability: Capped at 12 months' fees paid — LOW severity. No unusual IP assignment or non-compete clauses detected.\n\n${DISCLAIMER}`,
          },
          modelVersion: "gpt-4o-2024-08-06",
          tokensUsed: 2210,
          createdAt: daysFromNow(-149),
        },
      ],
      witnessInvitations: [
        {
          id: "00000000-0000-4000-8000-000000000331",
          issuedByUserId: USER_OWNER_ID,
          witnessEmail: "counsel@acmerobotics.com",
          witnessName: "Reg Halloway",
          status: "EXPIRED",
          expiresAt: daysFromNow(-100),
          createdAt: daysFromNow(-110),
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000302",
      slug: "blackwood-supply-agreement",
      title: "Supply Agreement",
      counterparty: "Blackwood Manufacturing Co.",
      uploadedByUserId: USER_OPS_ID,
      businessStatus: "UNDER_REVIEW",
      processingStatus: "AI_PENDING",
      legalState: "ACTIVE",
      tags: ["supply", "manufacturing"],
      expirationDate: daysFromNow(180),
      extractedTextPresent: true,
      createdAt: daysFromNow(-40),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000312",
          authorId: USER_OPS_ID,
          content:
            "Sharing with outside counterparty counsel for confirmation before we finalize pricing schedule Exhibit B.",
          createdAt: daysFromNow(-5),
        },
      ],
      aiAnalyses: [],
      witnessInvitations: [
        {
          id: "00000000-0000-4000-8000-000000000332",
          issuedByUserId: USER_OPS_ID,
          witnessEmail: "procurement@blackwoodmfg.com",
          witnessName: "Dana Ferreira",
          status: "ISSUED",
          expiresAt: daysFromNow(2),
          createdAt: daysFromNow(-5),
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000303",
      slug: "solstice-consulting-agreement",
      title: "Consulting Services Agreement",
      counterparty: "Solstice Energy Partners",
      uploadedByUserId: USER_ADMIN_ID,
      businessStatus: "DRAFT",
      processingStatus: "PENDING_EXTRACTION",
      legalState: "DRAFT",
      tags: ["consulting", "energy"],
      extractedTextPresent: false,
      createdAt: daysFromNow(-1),
      notes: [],
      aiAnalyses: [],
      witnessInvitations: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000304",
      slug: "harrow-finch-lease",
      title: "Commercial Lease Agreement",
      counterparty: "Harrow & Finch Properties",
      uploadedByUserId: USER_LEGAL_ID,
      businessStatus: "COMPLETED",
      processingStatus: "AI_COMPLETED",
      legalState: "EXPIRED",
      tags: ["lease", "real-estate"],
      expirationDate: daysFromNow(-90),
      extractedTextPresent: true,
      createdAt: daysFromNow(-400),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000313",
          authorId: USER_LEGAL_ID,
          content:
            "Lease term has ended. Landlord confirmed via the witness link that they do not intend to invoke the auto-renewal clause.",
          createdAt: daysFromNow(-88),
        },
      ],
      aiAnalyses: [
        {
          id: "00000000-0000-4000-8000-000000000323",
          type: "RISK",
          status: "COMPLETED",
          promptUsed:
            "Scan this contract for auto-renewal, uncapped liability, indemnification, IP assignment, non-compete, and clawback risks.",
          result: {
            text: `Auto-renewal: Lease renews for successive 12-month terms unless either party gives 120 days' written notice before expiration — HIGH severity, notice window already passed once before. No uncapped liability or unusual indemnification detected.\n\n${DISCLAIMER}`,
          },
          modelVersion: "gpt-4o-2024-08-06",
          tokensUsed: 1650,
          createdAt: daysFromNow(-95),
        },
      ],
      witnessInvitations: [
        {
          id: "00000000-0000-4000-8000-000000000333",
          issuedByUserId: USER_LEGAL_ID,
          witnessEmail: "landlord@harrowfinch.com",
          witnessName: "Owen Harrow",
          status: "USED",
          expiresAt: daysFromNow(-85),
          usedAt: daysFromNow(-89),
          createdAt: daysFromNow(-92),
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000305",
      slug: "meridian-health-dpa",
      title: "Data Processing Addendum",
      counterparty: "Meridian Health Systems",
      uploadedByUserId: USER_LEGAL_ID,
      businessStatus: "UNDER_REVIEW",
      processingStatus: "EXTRACTION_COMPLETED",
      legalState: "ACTIVE",
      tags: ["dpa", "healthcare", "compliance"],
      expirationDate: daysFromNow(280),
      extractedTextPresent: true,
      createdAt: daysFromNow(-20),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000314",
          authorId: USER_LEGAL_ID,
          content:
            "Flagged section 4.2 (subprocessor notification window) for compliance review before signature.",
          createdAt: daysFromNow(-18),
        },
        {
          id: "00000000-0000-4000-8000-000000000315",
          authorId: USER_ADMIN_ID,
          content:
            "Compliance confirmed 4.2 is acceptable as written. Proceeding to AI risk scan next.",
          createdAt: daysFromNow(-15),
        },
      ],
      aiAnalyses: [],
      witnessInvitations: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000306",
      slug: "northstar-logistics-termination",
      title: "Logistics Services Agreement — Termination",
      counterparty: "Northstar Logistics LLC",
      uploadedByUserId: USER_ADMIN_ID,
      businessStatus: "ARCHIVED",
      processingStatus: "AI_COMPLETED",
      legalState: "TERMINATED",
      tags: ["logistics", "terminated"],
      expirationDate: daysFromNow(-60),
      extractedTextPresent: true,
      createdAt: daysFromNow(-300),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000316",
          authorId: USER_ADMIN_ID,
          content:
            "Terminated for cause following repeated missed delivery SLAs. See termination letter attached separately.",
          createdAt: daysFromNow(-62),
        },
      ],
      aiAnalyses: [
        {
          id: "00000000-0000-4000-8000-000000000324",
          type: "SUMMARY",
          status: "COMPLETED",
          promptUsed:
            "Analyze the following contract and answer: obligations, payment terms, termination conditions.",
          result: {
            text: `Obligations: Northstar Logistics LLC to provide freight and warehousing services against agreed SLAs. Payment: Monthly invoicing, net-15. Termination: For cause with 15 days' cure period, or for convenience with 60 days' notice.\n\n${DISCLAIMER}`,
          },
          modelVersion: "gpt-4o-2024-08-06",
          tokensUsed: 1520,
          createdAt: daysFromNow(-63),
        },
      ],
      witnessInvitations: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000307",
      slug: "pinehollow-licensing-agreement",
      title: "Content Licensing Agreement",
      counterparty: "Pinehollow Creative Studio",
      uploadedByUserId: USER_OPS_ID,
      businessStatus: "DRAFT",
      processingStatus: "EXTRACTION_FAILED",
      processingError:
        "No extractable text layer detected — file appears to be a scanned/image-only PDF.",
      legalState: "DRAFT",
      tags: ["licensing", "creative"],
      extractedTextPresent: false,
      createdAt: daysFromNow(-3),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000317",
          authorId: USER_OPS_ID,
          content:
            "Automatic text extraction failed — the scanned PDF appears to be image-only. Requested a text-native copy from the counterparty; contract remains usable in the meantime via manual review.",
          createdAt: daysFromNow(-3),
        },
      ],
      aiAnalyses: [],
      witnessInvitations: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000308",
      slug: "vantage-capital-loan-agreement",
      title: "Loan and Security Agreement",
      counterparty: "Vantage Capital Partners",
      uploadedByUserId: USER_ADMIN_ID,
      businessStatus: "COMPLETED",
      processingStatus: "AI_COMPLETED",
      legalState: "ACTIVE",
      tags: ["loan", "finance", "high-risk"],
      expirationDate: daysFromNow(610),
      extractedTextPresent: true,
      createdAt: daysFromNow(-95),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000318",
          authorId: USER_ADMIN_ID,
          content:
            "Escalated the uncapped indemnification clause to outside counsel before signature — see risk analysis below.",
          createdAt: daysFromNow(-90),
        },
      ],
      aiAnalyses: [
        {
          id: "00000000-0000-4000-8000-000000000325",
          type: "RISK",
          status: "COMPLETED",
          promptUsed:
            "Scan this contract for auto-renewal, uncapped liability, indemnification, IP assignment, non-compete, and clawback risks.",
          result: {
            text: `Liability: No cap on indemnification obligations for breach of representations — HIGH severity. Clawback: Lender may demand early repayment on undefined "material adverse change" — MEDIUM severity, vague trigger language.\n\n${DISCLAIMER}`,
          },
          modelVersion: "gpt-4o-2024-08-06",
          tokensUsed: 2480,
          createdAt: daysFromNow(-92),
        },
      ],
      witnessInvitations: [
        {
          id: "00000000-0000-4000-8000-000000000334",
          issuedByUserId: USER_ADMIN_ID,
          witnessEmail: "outside.counsel@vantagecapital.com",
          witnessName: "Priya Malhotra",
          status: "REVOKED",
          expiresAt: daysFromNow(-60),
          isRevoked: true,
          createdAt: daysFromNow(-91),
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000309",
      slug: "coral-bay-vendor-agreement",
      title: "Vendor Services Agreement",
      counterparty: "Coral Bay Hospitality Group",
      uploadedByUserId: USER_LEGAL_ID,
      businessStatus: "UNDER_REVIEW",
      processingStatus: "AI_COMPLETED",
      legalState: "ACTIVE",
      tags: ["vendor", "hospitality"],
      expirationDate: daysFromNow(25),
      extractedTextPresent: true,
      createdAt: daysFromNow(-60),
      notes: [
        {
          id: "00000000-0000-4000-8000-000000000319",
          authorId: USER_LEGAL_ID,
          content:
            "Expiration is coming up in under a month — confirm with Ops whether we're renewing before it lapses.",
          createdAt: daysFromNow(-2),
        },
      ],
      aiAnalyses: [
        {
          id: "00000000-0000-4000-8000-000000000326",
          type: "CLAUSE_QUERY",
          status: "COMPLETED",
          promptUsed:
            "Question: Does this contract require advance written notice before either party can decline to renew?",
          result: {
            text: `Yes — Section 9.1 requires written notice at least 30 days before the current term ends. If no notice is given, the agreement renews automatically for a further 12 months.\n\n${DISCLAIMER}`,
          },
          modelVersion: "gpt-4o-2024-08-06",
          tokensUsed: 940,
          createdAt: daysFromNow(-2),
        },
      ],
      witnessInvitations: [],
    },
    {
      id: "00000000-0000-4000-8000-00000000030a",
      slug: "ironclad-security-services",
      title: "Security Services Contract",
      counterparty: "Ironclad Security Services",
      uploadedByUserId: USER_OPS_ID,
      businessStatus: "COMPLETED",
      processingStatus: "AI_COMPLETED",
      legalState: "TERMINATED",
      tags: ["security", "vendor"],
      expirationDate: daysFromNow(-30),
      extractedTextPresent: true,
      createdAt: daysFromNow(-500),
      deletedAt: daysFromNow(-10),
      notes: [],
      aiAnalyses: [
        {
          id: "00000000-0000-4000-8000-000000000327",
          type: "SUMMARY",
          status: "COMPLETED",
          promptUsed:
            "Analyze the following contract and answer: obligations, payment terms, termination conditions.",
          result: {
            text: `Obligations: Ironclad Security Services to provide on-site guard coverage per the staffing schedule. Payment: Monthly, net-30. Termination: Contract has since expired and was not renewed.\n\n${DISCLAIMER}`,
          },
          modelVersion: "gpt-4o-2024-08-06",
          tokensUsed: 1180,
          createdAt: daysFromNow(-35),
        },
      ],
      witnessInvitations: [],
    },
  ];

  for (const c of CONTRACTS) {
    await prisma.contract.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        organizationId: ORG_ID,
        uploadedByUserId: c.uploadedByUserId,
        title: c.title,
        counterparty: c.counterparty,
        businessStatus: c.businessStatus,
        processingStatus: c.processingStatus,
        processingError: c.processingError,
        legalState: c.legalState,
        tags: c.tags,
        expirationDate: c.expirationDate,
        fileKey: `contracts/${ORG_ID}/${c.slug}.pdf`,
        fileChecksum: fakeChecksum(c.slug),
        extractedText: c.extractedTextPresent
          ? `[Seed demo text] ${c.title} between Ridgeline & Voss LLP and ${c.counterparty}. Full extracted contract body would appear here in a real upload.`
          : null,
        deletedAt: c.deletedAt,
        createdAt: c.createdAt,
      },
    });

    for (const note of c.notes) {
      await prisma.contractNote.upsert({
        where: { id: note.id },
        update: {},
        create: {
          id: note.id,
          contractId: c.id,
          authorId: note.authorId,
          content: note.content,
          createdAt: note.createdAt,
        },
      });
    }

    for (const analysis of c.aiAnalyses) {
      await prisma.aIAnalysis.upsert({
        where: { id: analysis.id },
        update: {},
        create: {
          id: analysis.id,
          contractId: c.id,
          createdByUserId: c.uploadedByUserId,
          type: analysis.type,
          status: analysis.status,
          promptUsed: analysis.promptUsed,
          result: analysis.result,
          modelVersion: analysis.modelVersion,
          tokensUsed: analysis.tokensUsed,
          createdAt: analysis.createdAt,
        },
      });
    }

    for (const witness of c.witnessInvitations) {
      await prisma.witnessInvitation.upsert({
        where: { id: witness.id },
        update: {},
        create: {
          id: witness.id,
          contractId: c.id,
          issuedByUserId: witness.issuedByUserId,
          witnessEmail: witness.witnessEmail,
          witnessName: witness.witnessName,
          tokenHash: tokenHash(witness.id),
          status: witness.status,
          expiresAt: witness.expiresAt,
          usedAt: witness.usedAt,
          isRevoked: witness.isRevoked ?? false,
          createdAt: witness.createdAt,
        },
      });
    }
  }

  // ─── Audit log ──────────────────────────────────────────────────────────
  // A representative (not exhaustive) trail covering organization setup,
  // membership changes, and contract activity — enough to populate an
  // audit view meaningfully without hand-writing an entry per field change.
  const auditEntries: Array<{
    id: string;
    actorUserId?: string;
    action:
      | "ORGANIZATION_CREATED"
      | "OWNER_ASSIGNED"
      | "USER_INVITED"
      | "INVITATION_ACCEPTED"
      | "INVITATION_REVOKED"
      | "CONTRACT_UPLOADED"
      | "CONTRACT_TEXT_EXTRACTED"
      | "AI_ANALYSIS_COMPLETED"
      | "NOTE_ADDED"
      | "WITNESS_INVITATION_CREATED"
      | "WITNESS_ACCESSED"
      | "WITNESS_INVITATION_REVOKED"
      | "CONTRACT_SOFT_DELETED";
    targetEntityType: string;
    targetEntityId: string;
    contractId?: string;
    witnessInvitationId?: string;
    createdAt: Date;
  }> = [
    {
      id: "00000000-0000-4000-8000-000000000401",
      action: "ORGANIZATION_CREATED",
      targetEntityType: "Organization",
      targetEntityId: ORG_ID,
      createdAt: daysFromNow(-190),
    },
    {
      id: "00000000-0000-4000-8000-000000000402",
      actorUserId: USER_OWNER_ID,
      action: "OWNER_ASSIGNED",
      targetEntityType: "Organization",
      targetEntityId: ORG_ID,
      createdAt: daysFromNow(-190),
    },
    {
      id: "00000000-0000-4000-8000-000000000403",
      actorUserId: USER_OWNER_ID,
      action: "USER_INVITED",
      targetEntityType: "Invitation",
      targetEntityId: INVITATION_ADMIN_ID,
      createdAt: daysFromNow(-180),
    },
    {
      id: "00000000-0000-4000-8000-000000000404",
      actorUserId: USER_ADMIN_ID,
      action: "INVITATION_ACCEPTED",
      targetEntityType: "Invitation",
      targetEntityId: INVITATION_ADMIN_ID,
      createdAt: daysFromNow(-178),
    },
    {
      id: "00000000-0000-4000-8000-000000000405",
      actorUserId: USER_OWNER_ID,
      action: "USER_INVITED",
      targetEntityType: "Invitation",
      targetEntityId: INVITATION_REVOKED_ID,
      createdAt: daysFromNow(-8),
    },
    {
      id: "00000000-0000-4000-8000-000000000406",
      actorUserId: USER_OWNER_ID,
      action: "INVITATION_REVOKED",
      targetEntityType: "Invitation",
      targetEntityId: INVITATION_REVOKED_ID,
      createdAt: daysFromNow(-3),
    },
    {
      id: "00000000-0000-4000-8000-000000000407",
      actorUserId: USER_LEGAL_ID,
      action: "CONTRACT_UPLOADED",
      targetEntityType: "Contract",
      targetEntityId: "00000000-0000-4000-8000-000000000301",
      contractId: "00000000-0000-4000-8000-000000000301",
      createdAt: daysFromNow(-150),
    },
    {
      id: "00000000-0000-4000-8000-000000000408",
      actorUserId: USER_LEGAL_ID,
      action: "CONTRACT_TEXT_EXTRACTED",
      targetEntityType: "Contract",
      targetEntityId: "00000000-0000-4000-8000-000000000301",
      contractId: "00000000-0000-4000-8000-000000000301",
      createdAt: daysFromNow(-150),
    },
    {
      id: "00000000-0000-4000-8000-000000000409",
      actorUserId: USER_LEGAL_ID,
      action: "AI_ANALYSIS_COMPLETED",
      targetEntityType: "AIAnalysis",
      targetEntityId: "00000000-0000-4000-8000-000000000321",
      contractId: "00000000-0000-4000-8000-000000000301",
      createdAt: daysFromNow(-149),
    },
    {
      id: "00000000-0000-4000-8000-00000000040a",
      actorUserId: USER_OPS_ID,
      action: "WITNESS_INVITATION_CREATED",
      targetEntityType: "WitnessInvitation",
      targetEntityId: "00000000-0000-4000-8000-000000000332",
      contractId: "00000000-0000-4000-8000-000000000302",
      witnessInvitationId: "00000000-0000-4000-8000-000000000332",
      createdAt: daysFromNow(-5),
    },
    {
      id: "00000000-0000-4000-8000-00000000040b",
      action: "WITNESS_ACCESSED",
      targetEntityType: "WitnessInvitation",
      targetEntityId: "00000000-0000-4000-8000-000000000333",
      contractId: "00000000-0000-4000-8000-000000000304",
      witnessInvitationId: "00000000-0000-4000-8000-000000000333",
      createdAt: daysFromNow(-89),
    },
    {
      id: "00000000-0000-4000-8000-00000000040c",
      actorUserId: USER_ADMIN_ID,
      action: "WITNESS_INVITATION_REVOKED",
      targetEntityType: "WitnessInvitation",
      targetEntityId: "00000000-0000-4000-8000-000000000334",
      contractId: "00000000-0000-4000-8000-000000000308",
      witnessInvitationId: "00000000-0000-4000-8000-000000000334",
      createdAt: daysFromNow(-88),
    },
    {
      id: "00000000-0000-4000-8000-00000000040d",
      actorUserId: USER_ADMIN_ID,
      action: "CONTRACT_SOFT_DELETED",
      targetEntityType: "Contract",
      targetEntityId: "00000000-0000-4000-8000-00000000030a",
      contractId: "00000000-0000-4000-8000-00000000030a",
      createdAt: daysFromNow(-10),
    },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        organizationId: ORG_ID,
        actorType: entry.actorUserId ? "USER" : "SYSTEM",
        actorUserId: entry.actorUserId,
        action: entry.action,
        targetEntityType: entry.targetEntityType,
        targetEntityId: entry.targetEntityId,
        contractId: entry.contractId,
        witnessInvitationId: entry.witnessInvitationId,
        createdAt: entry.createdAt,
      },
    });
  }

  console.info("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // @starter-kit/shared's barrel also creates BullMQ Queue connections to
    // Redis as an import side effect (this script never uses them) — those
    // stay open and keep the event loop alive indefinitely otherwise.
    process.exit(process.exitCode ?? 0);
  });
