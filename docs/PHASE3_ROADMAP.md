# Phase 3 Integration Roadmap

## Overview

Phase 3 expands the BF Fund Investor Dataroom platform with advanced accounting integrations, tax document automation, and startup equity management. This roadmap outlines the technical implementation plan for each integration.

---

## 1. QuickBooks Integration

### Purpose
Synchronize fund accounting data with QuickBooks Online for seamless bookkeeping, expense tracking, and financial reporting.

### Scope
- Journal entry sync for capital calls and distributions
- Expense categorization and tracking
- Investor contribution reconciliation
- Management fee calculations
- K-1 data preparation

### Technical Implementation

#### 1.1 Authentication Setup
```
Endpoint: /api/integrations/quickbooks/connect
Method: OAuth 2.0 authorization code flow
Scopes: com.intuit.quickbooks.accounting
```

**Implementation Steps:**
1. Register QuickBooks Developer app
2. Implement OAuth flow with Replit secrets management
3. Store refresh tokens securely (encrypted in database)
4. Implement token refresh middleware

#### 1.2 Data Sync Endpoints

| Endpoint | Purpose | Sync Direction |
|----------|---------|----------------|
| `/api/integrations/quickbooks/sync/capital-calls` | Sync capital call transactions | BF → QB |
| `/api/integrations/quickbooks/sync/distributions` | Sync distribution payments | BF → QB |
| `/api/integrations/quickbooks/sync/expenses` | Import fund expenses | QB → BF |
| `/api/integrations/quickbooks/sync/invoices` | Sync management fee invoices | BF → QB |

#### 1.3 Journal Entry Mapping

**Capital Call Entry:**
```
Debit:  Cash (Asset)                     $100,000
Credit: Partner Capital - LP Name (Equity) $100,000
Memo: Capital Call Q1 2026 - LP Name
```

**Distribution Entry:**
```
Debit:  Partner Capital - LP Name (Equity) $25,000
Credit: Cash (Asset)                       $25,000
Memo: Q4 2025 Distribution - LP Name
```

**Management Fee Entry:**
```
Debit:  Management Fee Expense           $10,000
Credit: Accounts Payable - GP            $10,000
Memo: 2% Annual Management Fee - Q1 2026
```

#### 1.4 Database Schema Additions

```prisma
model QuickBooksConnection {
  id            String   @id @default(cuid())
  teamId        String   @unique
  realmId       String   // QuickBooks Company ID
  accessToken   String   @db.Text // Encrypted
  refreshToken  String   @db.Text // Encrypted
  tokenExpiry   DateTime
  syncEnabled   Boolean  @default(true)
  lastSyncAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  team          Team     @relation(fields: [teamId], references: [id])
}

model QuickBooksSyncLog {
  id            String   @id @default(cuid())
  connectionId  String
  syncType      String   // capital_call, distribution, expense
  recordId      String   // BF record ID
  qbId          String?  // QuickBooks record ID
  status        String   // pending, success, failed
  errorMessage  String?
  syncedAt      DateTime @default(now())
}
```

#### 1.5 Webhook Handler
```
POST /api/webhooks/quickbooks
- Verify Intuit signature
- Handle CDC (Change Data Capture) events
- Sync expense updates back to platform
```

### Timeline
- **Week 1-2**: OAuth setup, connection management UI
- **Week 3-4**: Journal entry sync for capital calls/distributions
- **Week 5-6**: Expense import and categorization
- **Week 7-8**: Testing, error handling, reconciliation reports

---

## 2. Wolters Kluwer Integration

### Purpose
Automate K-1 generation and tax document preparation for fund investors.

### Scope
- K-1 (Schedule K-1 Form 1065) generation
- Tax allocation calculations
- State-specific K-1 supplements
- Document delivery and tracking
- Historical tax document archive

### Technical Implementation

#### 2.1 CCH Axcess Tax API Integration

**Authentication:**
```
Method: API Key + OAuth 2.0
Base URL: https://api.cchaxcess.com/v1
Headers: X-API-Key, Authorization: Bearer {token}
```

#### 2.2 Data Mapping

| BF Fund Field | K-1 Field | Box |
|---------------|-----------|-----|
| Investor.name | Partner Name | Header |
| Investor.taxId | Partner TIN | Header |
| Investment.distributedCapital | Distributions | 19A |
| Investment.ordinaryIncome | Ordinary Income | 1 |
| Investment.interestIncome | Interest Income | 5 |
| Investment.dividendIncome | Dividend Income | 6a |
| Investment.capitalGainLT | Net LT Capital Gain | 9a |
| Investment.capitalGainST | Net ST Capital Gain | 8 |
| Investment.section199A | Section 199A | 20 |

#### 2.3 K-1 Generation Workflow

```
1. Tax Year Close
   └── Calculate allocations per partnership agreement
   
2. Generate Draft K-1s
   └── POST /api/tax/k1/generate
   └── Apply waterfall calculations
   └── Calculate state apportionments
   
3. Review & Approve
   └── GP reviews in admin dashboard
   └── Mark approved for delivery
   
4. Deliver to Investors
   └── Generate PDFs
   └── Upload to investor vaults
   └── Send email notifications
   
5. Track Delivery
   └── Log views and downloads
   └── Support amendments if needed
```

#### 2.4 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tax/k1/generate` | POST | Generate K-1s for a fund/year |
| `/api/tax/k1/[id]` | GET | Retrieve specific K-1 |
| `/api/tax/k1/[id]/approve` | POST | Approve K-1 for delivery |
| `/api/tax/k1/[id]/amend` | POST | Create amended K-1 |
| `/api/tax/allocations` | GET | View allocation calculations |
| `/api/tax/k1/deliver` | POST | Deliver approved K-1s |

#### 2.5 Database Schema Additions

```prisma
model K1Document {
  id            String   @id @default(cuid())
  fundId        String
  investorId    String
  taxYear       Int
  status        K1Status @default(DRAFT)
  
  // Income allocations
  ordinaryIncome    Decimal @default(0)
  interestIncome    Decimal @default(0)
  dividendIncome    Decimal @default(0)
  capitalGainLT     Decimal @default(0)
  capitalGainST     Decimal @default(0)
  section199A       Decimal @default(0)
  
  // Distributions
  distributions     Decimal @default(0)
  capitalContrib    Decimal @default(0)
  endingCapital     Decimal @default(0)
  
  // State allocations (JSON)
  stateAllocations  Json?
  
  // Document tracking
  pdfUrl            String?
  deliveredAt       DateTime?
  viewedAt          DateTime?
  downloadedAt      DateTime?
  
  // Amendments
  isAmended         Boolean @default(false)
  amendedFromId     String?
  amendmentReason   String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  fund              Fund     @relation(fields: [fundId], references: [id])
  investor          Investor @relation(fields: [investorId], references: [id])
}

enum K1Status {
  DRAFT
  PENDING_REVIEW
  APPROVED
  DELIVERED
  AMENDED
}

model TaxAllocation {
  id            String   @id @default(cuid())
  fundId        String
  taxYear       Int
  
  // Fund-level totals
  totalOrdinaryIncome   Decimal
  totalInterestIncome   Decimal
  totalDividendIncome   Decimal
  totalCapitalGainLT    Decimal
  totalCapitalGainST    Decimal
  
  // Allocation method
  allocationMethod      String  // percentage, capital_account, hybrid
  
  calculatedAt          DateTime @default(now())
  approvedAt            DateTime?
  approvedBy            String?
  
  fund                  Fund     @relation(fields: [fundId], references: [id])
}
```

### Timeline
- **Week 1-2**: API integration setup, authentication
- **Week 3-4**: Allocation calculation engine
- **Week 5-6**: K-1 PDF generation and preview
- **Week 7-8**: Delivery workflow and investor vault integration
- **Week 9-10**: State supplements, amendments, testing

---

## 3. Cap Table Management (STARTUP Mode)

### Purpose
Enable STARTUP entity mode with full cap table management for equity-based investments.

### Scope
- Share class management
- Equity rounds tracking
- Convertible instruments (SAFEs, notes)
- Option pool and grants
- Pro-forma modeling
- 409A integration preparation

### Technical Implementation

#### 3.1 Entity Mode Switch

```typescript
// EntityMode enum already exists
enum EntityMode {
  FUND      // LP/GP structure, units, capital calls
  STARTUP   // Cap table, shares, equity rounds
}
```

#### 3.2 Database Schema Additions

```prisma
model ShareClass {
  id                String   @id @default(cuid())
  entityId          String
  name              String   // Common, Series A, Series B, etc.
  type              ShareType
  authorizedShares  BigInt
  issuedShares      BigInt   @default(0)
  pricePerShare     Decimal?
  liquidationPref   Decimal  @default(1.0)
  participatingPref Boolean  @default(false)
  antiDilution      AntiDilutionType @default(NONE)
  conversionRatio   Decimal  @default(1.0)
  votingMultiple    Decimal  @default(1.0)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  entity            Entity   @relation(fields: [entityId], references: [id])
  holdings          ShareHolding[]
  vestingGrants     VestingGrant[]
}

enum ShareType {
  COMMON
  PREFERRED
  RESTRICTED
  OPTION
  WARRANT
}

enum AntiDilutionType {
  NONE
  FULL_RATCHET
  BROAD_WEIGHTED_AVERAGE
  NARROW_WEIGHTED_AVERAGE
}

model ShareHolding {
  id              String   @id @default(cuid())
  shareClassId    String
  investorId      String?
  founderId       String?
  holderName      String
  holderEmail     String?
  
  shares          BigInt
  acquiredDate    DateTime
  costBasis       Decimal  @default(0)
  pricePerShare   Decimal
  
  // For restricted stock
  isRestricted    Boolean  @default(false)
  vestingGrantId  String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  shareClass      ShareClass    @relation(fields: [shareClassId], references: [id])
  investor        Investor?     @relation(fields: [investorId], references: [id])
  vestingGrant    VestingGrant? @relation(fields: [vestingGrantId], references: [id])
}

model EquityRound {
  id              String   @id @default(cuid())
  entityId        String
  name            String   // Seed, Series A, etc.
  type            RoundType
  status          RoundStatus @default(OPEN)
  
  targetAmount    Decimal
  raisedAmount    Decimal  @default(0)
  preMoney        Decimal
  postMoney       Decimal
  pricePerShare   Decimal
  
  leadInvestor    String?
  closingDate     DateTime?
  
  // Terms
  shareClassId    String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  entity          Entity   @relation(fields: [entityId], references: [id])
}

enum RoundType {
  PRE_SEED
  SEED
  SERIES_A
  SERIES_B
  SERIES_C
  BRIDGE
  SECONDARY
}

enum RoundStatus {
  PLANNING
  OPEN
  CLOSING
  CLOSED
}

model ConvertibleInstrument {
  id              String   @id @default(cuid())
  entityId        String
  investorId      String
  type            ConvertibleType
  status          ConvertibleStatus @default(OUTSTANDING)
  
  principalAmount Decimal
  valuationCap    Decimal?
  discountRate    Decimal? // e.g., 0.20 for 20%
  interestRate    Decimal? // For convertible notes
  
  issueDate       DateTime
  maturityDate    DateTime?
  
  // Conversion details
  convertedShares BigInt?
  convertedDate   DateTime?
  convertedRoundId String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  entity          Entity   @relation(fields: [entityId], references: [id])
  investor        Investor @relation(fields: [investorId], references: [id])
}

enum ConvertibleType {
  SAFE
  CONVERTIBLE_NOTE
  KISS
}

enum ConvertibleStatus {
  OUTSTANDING
  CONVERTED
  CANCELLED
  MATURED
}
```

#### 3.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/captable/share-classes` | GET, POST | Manage share classes |
| `/api/captable/holdings` | GET, POST | View/add share holdings |
| `/api/captable/rounds` | GET, POST | Manage equity rounds |
| `/api/captable/rounds/[id]/close` | POST | Close an equity round |
| `/api/captable/convertibles` | GET, POST | Manage SAFEs/notes |
| `/api/captable/convertibles/[id]/convert` | POST | Convert to equity |
| `/api/captable/summary` | GET | Cap table summary |
| `/api/captable/proforma` | POST | Model dilution scenarios |

#### 3.4 Cap Table Summary Response

```json
{
  "entity": {
    "id": "entity_123",
    "name": "Acme Corp",
    "mode": "STARTUP"
  },
  "summary": {
    "totalAuthorizedShares": 10000000,
    "totalIssuedShares": 6500000,
    "fullyDilutedShares": 8000000,
    "lastValuation": 50000000
  },
  "shareClasses": [
    {
      "name": "Common",
      "issuedShares": 4000000,
      "percentageOwned": 50.0
    },
    {
      "name": "Series A Preferred",
      "issuedShares": 2000000,
      "percentageOwned": 25.0
    }
  ],
  "optionPool": {
    "reserved": 1500000,
    "granted": 1000000,
    "exercised": 200000,
    "available": 500000
  },
  "convertibles": {
    "outstanding": 2,
    "totalPrincipal": 500000,
    "potentialShares": 300000
  }
}
```

### Timeline
- **Week 1-2**: Share class and holdings models
- **Week 3-4**: Equity rounds management
- **Week 5-6**: SAFE/convertible note tracking
- **Week 7-8**: Pro-forma dilution modeling
- **Week 9-10**: Cap table UI, export to Excel

---

## 4. Vesting Schedule Calculations

### Purpose
Track equity vesting for founders, employees, and advisors.

### Scope
- Standard vesting schedules (4-year with 1-year cliff)
- Custom vesting configurations
- Acceleration provisions
- Exercise tracking
- Tax lot management

### Technical Implementation

#### 4.1 Database Schema

```prisma
model VestingGrant {
  id              String   @id @default(cuid())
  entityId        String
  shareClassId    String
  recipientName   String
  recipientEmail  String
  recipientType   RecipientType
  
  // Grant details
  grantDate       DateTime
  totalShares     BigInt
  pricePerShare   Decimal
  exercisePrice   Decimal? // For options
  
  // Vesting schedule
  vestingSchedule VestingSchedule @default(STANDARD_4Y_1Y)
  vestingStartDate DateTime
  cliffMonths     Int       @default(12)
  vestingMonths   Int       @default(48)
  
  // Custom schedule (if CUSTOM)
  vestingMilestones Json?
  
  // Acceleration
  singleTrigger   Boolean   @default(false)
  doubleTrigger   Boolean   @default(false)
  accelerationPercent Decimal @default(100)
  
  // Status tracking
  vestedShares    BigInt    @default(0)
  exercisedShares BigInt    @default(0)
  cancelledShares BigInt    @default(0)
  
  // Exercise window (for termination)
  terminationDate DateTime?
  exerciseDeadline DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  entity          Entity    @relation(fields: [entityId], references: [id])
  shareClass      ShareClass @relation(fields: [shareClassId], references: [id])
  exercises       VestingExercise[]
  holdings        ShareHolding[]
}

enum RecipientType {
  FOUNDER
  EMPLOYEE
  ADVISOR
  CONSULTANT
  BOARD_MEMBER
}

enum VestingSchedule {
  STANDARD_4Y_1Y    // 4 years, 1 year cliff
  STANDARD_4Y_0C    // 4 years, no cliff
  ADVISOR_2Y        // 2 years monthly
  MONTHLY_3Y        // 3 years monthly
  QUARTERLY_4Y      // 4 years quarterly
  CUSTOM            // Custom milestones
}

model VestingExercise {
  id              String   @id @default(cuid())
  grantId         String
  exerciseDate    DateTime
  sharesExercised BigInt
  pricePerShare   Decimal
  totalCost       Decimal
  paymentMethod   PaymentMethod
  
  // Tax tracking
  fmvAtExercise   Decimal? // For 83(b) / AMT
  taxWithheld     Decimal  @default(0)
  
  createdAt       DateTime @default(now())
  
  grant           VestingGrant @relation(fields: [grantId], references: [id])
}

enum PaymentMethod {
  CASH
  CASHLESS
  NET_EXERCISE
}
```

#### 4.2 Vesting Calculation Engine

```typescript
interface VestingSnapshot {
  grantId: string;
  asOfDate: Date;
  totalShares: number;
  vestedShares: number;
  unvestedShares: number;
  exercisedShares: number;
  exercisableShares: number;
  vestingPercentage: number;
  nextVestDate: Date | null;
  nextVestAmount: number;
  schedule: VestingEvent[];
}

interface VestingEvent {
  date: Date;
  shares: number;
  cumulative: number;
  type: 'cliff' | 'monthly' | 'quarterly' | 'milestone';
}

// Calculate vesting for standard 4-year, 1-year cliff
function calculateStandardVesting(grant: VestingGrant, asOfDate: Date): VestingSnapshot {
  const cliffDate = addMonths(grant.vestingStartDate, grant.cliffMonths);
  const endDate = addMonths(grant.vestingStartDate, grant.vestingMonths);
  
  // Before cliff
  if (asOfDate < cliffDate) {
    return { vestedShares: 0, ... };
  }
  
  // At or after cliff
  const cliffShares = Math.floor(grant.totalShares * (grant.cliffMonths / grant.vestingMonths));
  const remainingShares = grant.totalShares - cliffShares;
  const monthsAfterCliff = grant.vestingMonths - grant.cliffMonths;
  const monthlyVest = Math.floor(remainingShares / monthsAfterCliff);
  
  // Calculate months vested after cliff
  const monthsVested = Math.min(
    differenceInMonths(asOfDate, cliffDate),
    monthsAfterCliff
  );
  
  const vestedShares = cliffShares + (monthsVested * monthlyVest);
  
  return {
    vestedShares: Math.min(vestedShares, grant.totalShares),
    ...
  };
}
```

#### 4.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vesting/grants` | GET, POST | List/create vesting grants |
| `/api/vesting/grants/[id]` | GET, PATCH | View/update grant |
| `/api/vesting/grants/[id]/calculate` | GET | Calculate current vesting |
| `/api/vesting/grants/[id]/exercise` | POST | Record share exercise |
| `/api/vesting/grants/[id]/accelerate` | POST | Trigger acceleration |
| `/api/vesting/grants/[id]/terminate` | POST | Handle termination |
| `/api/vesting/summary` | GET | All grants summary |

### Timeline
- **Week 1-2**: Vesting grant models and standard calculations
- **Week 3-4**: Custom schedules and milestones
- **Week 5-6**: Exercise tracking and tax lot management
- **Week 7-8**: Acceleration and termination handling
- **Week 9-10**: Reporting, 409A preparation hooks

---

## 5. Implementation Dependencies

### External Service Requirements

| Service | Purpose | Priority |
|---------|---------|----------|
| QuickBooks Online API | Accounting sync | High |
| Wolters Kluwer CCH Axcess | K-1 generation | High |
| Carta API (optional) | 409A valuations | Medium |
| DocuSign/PandaDoc (optional) | Board consent docs | Low |

### Internal Prerequisites

1. **Entity Mode Toggle**: UI for switching between FUND and STARTUP modes
2. **Multi-Entity Support**: Teams managing both funds and startups
3. **Audit Trail Extension**: Track all cap table changes
4. **Document Templates**: Equity grant agreements, stock certificates

---

## 6. Security Considerations

### Data Protection
- Encrypt all tax identifiers (SSN, EIN) at rest
- PCI-compliant handling of payment data
- Role-based access for sensitive financial data
- Audit logging for all cap table modifications

### API Security
- OAuth 2.0 for all external integrations
- Webhook signature verification
- Rate limiting on financial APIs
- IP allowlisting for accounting sync

---

## 7. Testing Strategy

### Integration Tests
- Mock QuickBooks sandbox environment
- Wolters Kluwer test mode
- Vesting calculation unit tests
- Cap table scenario tests

### Compliance Tests
- K-1 field validation
- Tax allocation accuracy
- 409A preparation requirements
- SEC reporting requirements

---

## 8. Rollout Plan

### Phase 3a (Weeks 1-10)
- QuickBooks integration
- Basic journal entry sync
- Expense tracking

### Phase 3b (Weeks 11-20)
- Wolters Kluwer K-1 integration
- Tax allocation engine
- Investor tax document portal

### Phase 3c (Weeks 21-30)
- STARTUP mode activation
- Cap table management
- Vesting schedule tracking

### Phase 3d (Weeks 31-40)
- Pro-forma modeling
- 409A preparation hooks
- Multi-entity dashboard
- Migration tools for existing users

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| QuickBooks sync accuracy | 99.9% |
| K-1 generation time | < 5 minutes per fund |
| Cap table calculation accuracy | 100% |
| Vesting calculation accuracy | 100% |
| User adoption (Phase 3 features) | 60% of active funds |

---

## 10. Open Questions

1. **QuickBooks Desktop**: Support needed for on-premise QB?
2. **State K-1s**: Which states require supplemental filings?
3. **International Investors**: Special K-1 handling for non-US LPs?
4. **Secondary Sales**: Support for equity secondaries in cap table?
5. **Tokenized Securities**: Future blockchain integration?

---

*Last Updated: January 2026*
*Version: 1.0*
