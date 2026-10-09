import { ConflictException, Injectable, InternalServerErrorException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async signUp(name: string, email: string, password: string, businessName: string) {
    const { data: created, error: createError } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createError || !created.user) {
      if (createError?.code === 'email_exists' || createError?.message.toLowerCase().includes('already')) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new InternalServerErrorException('Unable to create account');
    }

    try {
      const { data: auth, error: signInError } = await this.supabase.publicClient.auth.signInWithPassword({ email, password });
      if (signInError || !auth.session) throw new Error('Could not establish signup session');

      const client = this.supabase.forUser(auth.session.access_token);
      const { data: businessId, error: businessError } = await client.rpc('create_business_for_current_user', {
        p_name: businessName,
        p_slug: this.slugFromName(businessName, created.user.id),
        p_timezone: 'UTC',
      });
      if (businessError) throw businessError;
      const { data: business, error: readError } = await client.from('businesses').select('*').eq('id', businessId).single();
      if (readError) throw readError;
      return { user: auth.user, session: auth.session, business };
    } catch (error) {
      await this.supabase.admin.auth.admin.deleteUser(created.user.id);
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new ConflictException('That business slug is already in use');
      }
      if (typeof error === 'object' && error !== null && 'code' in error && ['PGRST202', 'PGRST205'].includes(String(error.code))) {
        throw new ServiceUnavailableException('Supabase Phase 1 schema is missing. Apply the database migration before signing up.');
      }
      throw new InternalServerErrorException('Unable to complete signup');
    }
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.publicClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return data;
  }

  async signOut(accessToken: string) {
    const { error } = await this.supabase.admin.auth.admin.signOut(accessToken, 'local');
    if (error) throw new UnauthorizedException('Unable to end session');
  }

  private slugFromName(name: string, userId: string): string {
    const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'business';
    return `${base}-${userId.slice(0, 8)}`;
  }
}