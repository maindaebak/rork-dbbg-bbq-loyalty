interface SendSmsResponse {
  success: boolean;
  status?: string;
  error?: string;
}

interface VerifySmsResponse {
  success: boolean;
  status?: string;
  error?: string;
}

interface AdminLoginResponse {
  success: boolean;
  email?: string;
  error?: string;
}

export async function sendSmsCode(phone: string): Promise<SendSmsResponse> {
  console.log("[API] sendSmsCode - TODO: implement with Supabase", phone);
  return { success: false, error: "Backend not yet configured. Supabase integration pending." };
}

export async function verifySmsCode(phone: string, code: string): Promise<VerifySmsResponse> {
  console.log("[API] verifySmsCode - TODO: implement with Supabase", phone, code);
  return { success: false, error: "Backend not yet configured. Supabase integration pending." };
}

export async function adminLogin(email: string, _password: string): Promise<AdminLoginResponse> {
  console.log("[API] adminLogin - TODO: implement with Supabase", email);
  return { success: false, error: "Backend not yet configured. Supabase integration pending." };
}
