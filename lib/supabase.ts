import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://piliiumtuvsqerpjzcgc.supabase.co";
const supabaseKey = "sb_publishable_SWyRnCc1H_BaRF8DIOhZqA_0eZEswXs";

export const supabase = createClient(supabaseUrl, supabaseKey);