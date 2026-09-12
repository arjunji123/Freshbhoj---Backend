/**
 * One-off backfill: every user created before the referral feature shipped
 * has `referralCode: null`. This gives each of them a code so the feature
 * works uniformly for old and new accounts alike.
 *
 * Idempotent — only touches rows where referralCode is still null. Safe to
 * re-run. Run with: npx ts-node -r tsconfig-paths/register scripts/backfill-referral-codes.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true, phone: true },
  });

  console.log(`Backfilling referral codes for ${users.length} user(s)...`);

  for (const user of users) {
    let assigned = false;
    for (let attempt = 0; attempt < 5 && !assigned; attempt++) {
      const code = generateCode();
      try {
        await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
        assigned = true;
        console.log(`  ${user.phone} -> ${code}`);
      } catch {
        // Collision on the unique constraint — retry with a new code.
      }
    }
    if (!assigned) {
      console.warn(`  Could not assign a code to ${user.phone} after 5 attempts`);
    }
  }

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
