
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://majqcigzgkruroqijshu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hanFjaWd6Z2tydXJvcWlqc2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODYxODMsImV4cCI6MjA4MDg2MjE4M30.lUOoRmTXFhQbRSs6koj3Ur1NtstSrMtq-W9FepJvCUU';

export const supabase = createClient(supabaseUrl, supabaseKey);
