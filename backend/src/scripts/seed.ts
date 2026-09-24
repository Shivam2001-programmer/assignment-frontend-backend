import type { LeadStatus } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { ACTORS } from '../modules/activities/activity.recorder.js';
import { ingestLead } from '../modules/leads/lead.ingest.js';
import { updateLeadStatus } from '../modules/leads/lead.service.js';

const PEOPLE: [name: string, city: string, seats: string, path: LeadStatus[]][] = [
  ['Aarav Mehta', 'Bengaluru', '10-20', ['CONTACTED', 'QUALIFIED', 'CONVERTED']],
  ['Diya Kapoor', 'Mumbai', '1-5', ['CONTACTED']],
  ['Kabir Nair', 'Pune', '20-50', ['CONTACTED', 'QUALIFIED']],
  ['Ananya Iyer', 'Chennai', '5-10', ['LOST']],
  ['Rohan Gupta', 'Delhi', '1-5', []],
  ['Isha Reddy', 'Hyderabad', '50+', ['QUALIFIED']],
  ['Vihaan Joshi', 'Gurugram', '10-20', ['CONTACTED', 'LOST']],
  ['Meera Pillai', 'Kochi', '1-5', []],
  ['Arjun Singh', 'Noida', '5-10', ['CONTACTED']],
  ['Saanvi Das', 'Kolkata', '20-50', []],
  ['Aditya Rao', 'Bengaluru', '1-5', ['CONTACTED', 'QUALIFIED', 'CONVERTED']],
  ['Nisha Verma', 'Jaipur', '5-10', []],
];

async function main() {
  if (await prisma.lead.count({ where: { externalId: { startsWith: 'demo_' } } })) {
    logger.info('demo data already present, skipping seed');
    return;
  }

  const now = Date.now();
  for (const [i, [name, city, seats, path]] of PEOPLE.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, '.');
    const { leadId, outcome } = await ingestLead(
      {
        source: 'meta',
        externalId: `demo_${1000 + i}`,
        fullName: name,
        email: `${slug}@example.com`,
        phone: `+9198${String(76543210 + i * 1111).padStart(8, '0')}`,
        pageId: 'demo_page',
        formId: 'demo_form_coworking',
        adId: `demo_ad_${(i % 3) + 1}`,
        adsetId: `demo_adset_${(i % 2) + 1}`,
        campaignId: i % 2 ? 'demo_cmp_day_pass' : 'demo_cmp_dedicated_desk',
        customFields: { city, team_size: seats },
        submittedAt: new Date(now - (PEOPLE.length - i) * 3_600_000),
      },
      { actor: ACTORS.seed },
    );
    if (outcome === 'created') {
      for (const status of path) await updateLeadStatus(leadId, { status }, 'user:demo-sales');
    }
  }
  logger.info({ count: PEOPLE.length }, 'seed complete');
}

main()
  .catch((err) => {
    logger.error({ err }, 'seed failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
