import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { persistSession: false } }
);

export async function resolveUserId(): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', config.syncTargetEmail)
    .single();

  if (error || !data) {
    throw new Error(
      `Could not find Supabase user with email "${config.syncTargetEmail}". ` +
      `Make sure you have signed up in the app first. Error: ${error?.message}`
    );
  }

  return data.id as string;
}
