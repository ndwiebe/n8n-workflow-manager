import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class Database {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'n8n_workflow_manager',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.NODE_ENV === 'production',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    };

    // Create connection pool
    this.pool = new Pool({
      ...this.config,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Handle pool connect
    this.pool.on('connect', () => {
      logger.debug('Database client connected');
    });

    // Handle pool remove
    this.pool.on('remove', () => {
      logger.debug('Database client removed');
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      logger.error('Failed to get database client:', error);
      throw error;
    }
  }

  /**
   * Execute a query with automatic client management
   */
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      logger.debug('Executing query:', { text, params });
      const result = await client.query(text, params);
      logger.debug('Query result:', { rowCount: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query failed:', { text, params, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      logger.debug('Transaction started');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      logger.debug('Transaction committed');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Initialize database tables
   */
  async initializeTables(): Promise<void> {
    try {
      logger.info('Initializing database tables...');

      // Create users table
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          company VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create workflow_configurations table
      await this.query(`
        CREATE TABLE IF NOT EXISTS workflow_configurations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id VARCHAR(255) NOT NULL,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'pending',
          credentials JSONB,
          activated_at TIMESTAMP,
          scheduled_activation TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create provisioning_jobs table
      await this.query(`
        CREATE TABLE IF NOT EXISTS provisioning_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          workflow_id VARCHAR(255) NOT NULL,
          template_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          configuration JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          error_message TEXT
        )
      `);

      // Create workflow_templates table
      await this.query(`
        CREATE TABLE IF NOT EXISTS workflow_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          icon VARCHAR(100),
          version VARCHAR(20),
          author VARCHAR(255),
          tags TEXT[],
          difficulty VARCHAR(50),
          estimated_setup_time VARCHAR(50),
          monthly_price DECIMAL(10,2),
          fields JSONB,
          external_tools TEXT[],
          features TEXT[],
          requirements JSONB,
          provisioning JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create sessions table for JWT token management
      await this.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_agent TEXT,
          ip_address INET
        )
      `);

      // Create audit_logs table
      await this.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id VARCHAR(255),
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      await this.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_workflow_configurations_user_id ON workflow_configurations(user_id)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_workflow_configurations_workflow_id ON workflow_configurations(workflow_id)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_user_id ON provisioning_jobs(user_id)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_status ON provisioning_jobs(status)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
      await this.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');

      // Create updated_at trigger function
      await this.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);

      // Create triggers for updated_at
      await this.query(`
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);

      await this.query(`
        CREATE TRIGGER update_workflow_configurations_updated_at BEFORE UPDATE ON workflow_configurations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);

      await this.query(`
        CREATE TRIGGER update_provisioning_jobs_updated_at BEFORE UPDATE ON provisioning_jobs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);

      await this.query(`
        CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);

      logger.info('Database tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database tables:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    tables: Array<{
      name: string;
      rowCount: number;
      size: string;
    }>;
  }> {
    try {
      // Get connection stats
      const connectionStats = await this.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      // Get table stats
      const tableStats = await this.query(`
        SELECT 
          schemaname,
          tablename as name,
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      return {
        totalConnections: connectionStats.rows[0].total_connections,
        activeConnections: connectionStats.rows[0].active_connections,
        idleConnections: connectionStats.rows[0].idle_connections,
        tables: tableStats.rows.map(row => ({
          name: row.name,
          rowCount: parseInt(row.row_count) || 0,
          size: row.size,
        })),
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection pool:', error);
      throw error;
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      return result.rows[0].exists;
    } catch (error) {
      logger.error(`Failed to check if table ${tableName} exists:`, error);
      return false;
    }
  }

  /**
   * Execute migrations
   */
  async migrate(): Promise<void> {
    try {
      logger.info('Running database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add any future migrations here
      const migrations = [
        {
          name: '001_initial_schema',
          sql: () => this.initializeTables(),
        },
        // Add more migrations as needed
      ];

      for (const migration of migrations) {
        const exists = await this.query(
          'SELECT 1 FROM migrations WHERE name = $1',
          [migration.name]
        );

        if (exists.rows.length === 0) {
          logger.info(`Running migration: ${migration.name}`);
          await migration.sql();
          await this.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [migration.name]
          );
          logger.info(`Migration completed: ${migration.name}`);
        } else {
          logger.debug(`Migration already applied: ${migration.name}`);
        }
      }

      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Failed to run migrations:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const database = new Database();