import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZmN4eHluanZ5aGFyaHRmcHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg1MTk4OSwiZXhwIjoyMDgyNDI3OTg5fQ.9wZNnGz5nSxK-RDj41GRXu3s1IG0DZ-Iv5tozPZC6GY';
const CUMBERLAND_MARKET_ID = '0602afe2-fae2-4e46-af2c-7b374bfc9d45';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Contact {
  name: string;
  email: string;
}

function parseCSV(filePath: string): Contact[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const contacts: Contact[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted fields)
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());

    const name = fields[0] || '';
    const email = fields[4] || ''; // Email is 5th column (index 4)

    // Validate email
    if (email && email.includes('@') && email.includes('.')) {
      contacts.push({
        name: name.replace(/^"|"$/g, ''), // Remove surrounding quotes
        email: email.toLowerCase().trim()
      });
    }
  }

  return contacts;
}

async function importContacts() {
  console.log('🔍 Reading CSV file...');
  const csvPath = '/Users/leandertoney/Desktop/Sunchilld1-1000 - Sheet1 (1).csv';

  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    process.exit(1);
  }

  const contacts = parseCSV(csvPath);
  console.log(`📧 Found ${contacts.length} contacts with valid emails`);

  // Deduplicate by email
  const uniqueContacts = Array.from(
    new Map(contacts.map(c => [c.email, c])).values()
  );
  console.log(`✨ Unique contacts: ${uniqueContacts.length}`);

  // Insert in batches of 500
  const batchSize = 500;
  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < uniqueContacts.length; i += batchSize) {
    const batch = uniqueContacts.slice(i, i + batchSize);

    const records = batch.map(contact => ({
      email: contact.email,
      name: contact.name || null,
      source_label: 'Partner List',
      market_id: CUMBERLAND_MARKET_ID,
      is_unsubscribed: false
    }));

    console.log(`\n📤 Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueContacts.length / batchSize)}...`);

    const { data, error } = await supabase
      .from('platform_contacts')
      .upsert(records, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id, email');

    if (error) {
      console.error('❌ Error importing batch:', error.message);
      errors += batch.length;
    } else {
      console.log(`✅ Batch imported successfully (${data?.length || 0} records)`);
      imported += data?.length || 0;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   Total contacts in CSV: ${contacts.length}`);
  console.log(`   Unique emails: ${uniqueContacts.length}`);
  console.log(`   Successfully imported/updated: ${imported}`);
  console.log(`   Errors: ${errors}`);
  console.log('\n✅ Import complete!');
}

importContacts().catch(console.error);
