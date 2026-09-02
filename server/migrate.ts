import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { syncAllSheets, parseSheetDate } from './googleSheets.js';
import ws from 'ws';

// Load env variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: {
    transport: ws,
  },
});

async function migrate() {
  console.log('--- Starting Database Migration to Supabase ---');
  console.log(`Connecting to Supabase at: ${supabaseUrl}`);

  // 1. Fetch all data from Google Sheets
  console.log('Fetching data from Google Sheets (gviz)...');
  const { applications, users, feedbacks } = await syncAllSheets();
  console.log(`Successfully fetched from Google Sheets:`);
  console.log(`- ${users.length} users`);
  console.log(`- ${applications.length} applications`);
  console.log(`- ${feedbacks.length} feedback entries`);

  // 2. Insert Users
  if (users.length > 0) {
    console.log('Migrating users to Supabase...');
    const uniqueUsersMap = new Map<string, any>();
    users.forEach((u: any) => {
      uniqueUsersMap.set(u.icNumber, {
        id: u.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        icNumber: u.icNumber,
        name: u.name,
        phone: u.phone || '',
        email: u.email || '',
        institution: u.institution || 'Kolej Komuniti Beaufort',
        department: u.department || '',
        createdAt: u.createdAt || new Date().toISOString()
      });
    });
    const usersToInsert = Array.from(uniqueUsersMap.values());
    const { error: userError } = await supabase.from('users').upsert(usersToInsert, { onConflict: 'icNumber' });
    if (userError) {
      console.error('Error inserting users to Supabase:', userError);
    } else {
      console.log(`Migrated ${usersToInsert.length} unique users successfully.`);
    }
  }

  // 3. Insert Applications
  if (applications.length > 0) {
    console.log('Migrating applications to Supabase...');
    const appsToInsert = applications.map((a: any) => ({
      id: a.id || `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      applicationId: a.applicationId,
      applicationType: a.applicationType,
      category: a.category || null,
      language: a.language || 'MS',
      icNumber: a.icNumber,
      applicantName: a.applicantName,
      email: a.email || '',
      institution: a.institution || '',
      title: a.title,
      year: Number(a.year) || new Date().getFullYear(),
      status: a.status || 'COMPLETED',
      sourceSheet: a.sourceSheet || null,
      sheetRowIndex: a.sheetRowIndex !== undefined && a.sheetRowIndex !== null ? Number(a.sheetRowIndex) : null,
      innovationData: a.innovationData || null,
      researchData: a.researchData || null,
      generatedDocuments: a.generatedDocuments || [],
      driveUrl: a.driveUrl || '',
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt || new Date().toISOString()
    }));

    const { error: appError } = await supabase.from('applications').upsert(appsToInsert, { onConflict: 'applicationId' });
    if (appError) {
      console.error('Error inserting applications to Supabase:', appError);
    } else {
      console.log(`Migrated ${appsToInsert.length} applications successfully.`);
    }
  }

  // 4. Insert Feedbacks
  if (feedbacks.length > 0) {
    console.log('Migrating feedback to Supabase...');
    const feedbackToInsert = feedbacks.map((f: any, idx: number) => {
      const parsedDate = parseSheetDate(f.createdAt);
      const createdAt = parsedDate ? parsedDate.toISOString() : new Date().toISOString();
      return {
        id: f.id || `fb-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        jantina: f.jantina || '',
        umur: f.umur || '',
        bangsa: f.bangsa || '',
        s1: Number(f.s1) || 0,
        s2: Number(f.s2) || 0,
        s3: Number(f.s3) || 0,
        s4: Number(f.s4) || 0,
        s5: Number(f.s5) || 0,
        comments: f.comments || '',
        createdAt: createdAt
      };
    });

    const { error: fbError } = await supabase.from('feedback').upsert(feedbackToInsert, { onConflict: 'id' });
    if (fbError) {
      console.error('Error inserting feedback to Supabase:', fbError);
    } else {
      console.log(`Migrated ${feedbackToInsert.length} feedback entries successfully.`);
    }
  }

  console.log('--- Database Migration Complete! ---');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
});
