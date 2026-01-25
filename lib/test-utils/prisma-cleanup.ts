import prisma from '@/lib/prisma';

const tableOrder = [
  'signatureAuditLog',
  'signatureField',
  'signatureRecipient',
  'signatureDocument',
  'accreditationAck',
  'capitalCallAllocation',
  'capitalCall',
  'distributionAllocation',
  'distribution',
  'transaction',
  'bankLink',
  'investment',
  'investor',
  'fundPricingTier',
  'fund',
  'entityInvestor',
  'entity',
  'view',
  'viewer',
  'document',
  'folder',
  'link',
  'dataroom',
  'userTeam',
  'team',
  'user',
  'session',
  'account',
  'verificationToken',
];

export async function truncateAllTables(): Promise<{ success: boolean; tablesCleared: string[] }> {
  const tablesCleared: string[] = [];
  
  for (const table of tableOrder) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      tablesCleared.push(table);
    } catch (error) {
      continue;
    }
  }
  
  return { success: true, tablesCleared };
}

export async function truncateTables(tables: string[]): Promise<{ success: boolean; tablesCleared: string[] }> {
  const tablesCleared: string[] = [];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      tablesCleared.push(table);
    } catch (error) {
      continue;
    }
  }
  
  return { success: true, tablesCleared };
}

export async function deleteAllData(): Promise<{ success: boolean; tablesCleared: string[] }> {
  const tablesCleared: string[] = [];
  
  for (const table of tableOrder) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
      tablesCleared.push(table);
    } catch (error) {
      continue;
    }
  }
  
  return { success: true, tablesCleared };
}

export async function resetSequences(): Promise<{ success: boolean }> {
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
        LOOP
          EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
        END LOOP;
      END $$;
    `);
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function fullDatabaseReset(): Promise<{ 
  success: boolean; 
  tablesCleared: string[];
  sequencesReset: boolean;
}> {
  const truncateResult = await truncateAllTables();
  const sequenceResult = await resetSequences();
  
  return {
    success: truncateResult.success && sequenceResult.success,
    tablesCleared: truncateResult.tablesCleared,
    sequencesReset: sequenceResult.success,
  };
}

export function createMockCleanup() {
  return {
    clearAllMocks: () => {
      jest.clearAllMocks();
    },
    resetAllMocks: () => {
      jest.resetAllMocks();
    },
    restoreAllMocks: () => {
      jest.restoreAllMocks();
    },
  };
}

export const testCleanup = {
  truncateAllTables,
  truncateTables,
  deleteAllData,
  resetSequences,
  fullDatabaseReset,
  createMockCleanup,
};

export default testCleanup;
