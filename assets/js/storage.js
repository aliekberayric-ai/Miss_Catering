import { getSupabaseClient } from './supabase.js';

const BUCKET = 'site-assests';

function safeFileName(name = 'file') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function ensureBucketPublicUrl(path) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase nicht verbunden.');

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Konnte Public URL nicht erzeugen.');
  return data.publicUrl;
}

export async function uploadImage(file, folder = 'general') {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase nicht verbunden.');
  if (!file) throw new Error('Keine Datei gewählt.');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const base = safeFileName(file.name.replace(/\.[^.]+$/, '')) || 'image';
  const fileName = `${Date.now()}-${base}.${ext}`;
  const path = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  return await ensureBucketPublicUrl(path);
}
