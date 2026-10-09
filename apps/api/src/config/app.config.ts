export interface AppConfig {
  port: number;
  corsOrigins: string[];
  logLevel: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  private required(envVar: string): string {
    const value = this.env[envVar];
    if (!value) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
    return value;
  }

  private number(envVar: string, defaultValue: number): number {
    const value = this.env[envVar];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    return parseInt(value, 10);
  }

  private commaSeparated(envVar: string, defaultValue: string): string[] {
    const value = this.env[envVar];
    if (value === undefined || value === '') {
      return defaultValue.split(',').map((o) => o.trim());
    }
    return value.split(',').map((o) => o.trim());
  }

  public get port(): number {
    return this.number('PORT', 4000);
  }

  public get corsOrigins(): string[] {
    return this.commaSeparated('CORS_ORIGINS', 'http://localhost:5173');
  }

  public get logLevel(): string {
    return this.env.LOG_LEVEL ?? 'info';
  }

  public get supabaseUrl(): string {
    return this.required('SUPABASE_URL');
  }

  public get supabaseAnonKey(): string {
    return this.required('SUPABASE_ANON_KEY');
  }

  public get supabaseServiceRoleKey(): string {
    return this.required('SUPABASE_SERVICE_ROLE_KEY');
  }
}
