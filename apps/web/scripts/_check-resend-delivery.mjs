import { config } from 'dotenv';
import { Resend } from 'resend';
config({ path: new URL('../.env.local', import.meta.url) });

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_IDS = [
  { who: 'Tony', id: '968fe8ad-bf2b-41d9-8a00-5b8ee9b7cdd9' },
  { who: 'Steve', id: '2c6ee6ca-7c1d-4013-8e72-db2b0e6600d4' },
  { who: 'Brandi', id: '9e6c8501-eb58-4ba7-a47d-334c87e9cb63' },
  { who: 'Grace', id: 'a96ee058-4385-416c-9689-7f3a91e8b3e7' },
  { who: 'Craig', id: '0f4b74a7-4df1-4123-93de-a833da8c7246' },
  { who: 'Kayla', id: '6dbadcdf-6ff1-4f88-a4ab-437f78cb1b21' },
  { who: 'Bill', id: '1289d405-0e12-4b90-b68e-5f83d061bf0d' },
];

console.log('Checking Resend delivery status for all 7 emails...\n');

for (const e of EMAIL_IDS) {
  try {
    const result = await resend.emails.get(e.id);
    if (result.error) {
      console.log(`❌ ${e.who.padEnd(8)} | API error: ${JSON.stringify(result.error)}`);
      continue;
    }
    const d = result.data;
    console.log(`${e.who.padEnd(8)} | ${e.id}`);
    console.log(`         to: ${d.to?.join(', ')}`);
    console.log(`         from: ${d.from}`);
    console.log(`         subject: ${d.subject}`);
    console.log(`         created: ${d.created_at}`);
    console.log(`         last_event: ${d.last_event}`);
    console.log();
  } catch (err) {
    console.log(`❌ ${e.who}: ${err.message}`);
  }
}

// Also list domains to see verification status
console.log('─'.repeat(80));
console.log('Domain verification status:');
const domains = await resend.domains.list();
if (domains.data?.data) {
  for (const d of domains.data.data) {
    console.log(`  ${d.name} | status=${d.status} | region=${d.region}`);
  }
} else {
  console.log('  (could not fetch domains)');
}
