/**
 * Supabase Mock for NativeMimic v4.0 Testing
 * 
 * Comprehensive mocking of Supabase client and edge functions
 * to simulate backend interactions without external dependencies
 */

import { vi } from 'vitest';

// Mock data stores
const mockTables: Record<string, any[]> = {
  speech_events: [
    {
      id: 'event-1',
      user_id: 'test-user-123',
      text: 'Hello world',
      voice_id: 'test-voice-en',
      language: 'en-US',
      cost_cents: 5,
      duration_ms: 1500,
      created_at: new Date().toISOString()
    }
  ],
  user_feedback: [
    {
      id: 'feedback-1',
      user_id: 'test-user-123',
      type: 'voice_rating',
      content: 'Great voice quality',
      rating: 5,
      created_at: new Date().toISOString()
    }
  ],
  recordings: [
    {
      id: 'recording-1',
      user_id: 'test-user-123',
      file_path: 'recordings/test-recording-1.webm',
      duration_ms: 3000,
      file_size_bytes: 15000,
      created_at: new Date().toISOString()
    }
  ]
};

const mockStorageBuckets = {
  recordings: {
    'recordings/test-recording-1.webm': new Blob(['fake audio data'], { type: 'audio/webm' })
  },
  'tts-cache': {
    'cache/en-us/test-voice/hello-world.mp3': new Blob(['fake audio data'], { type: 'audio/mpeg' })
  }
};

// Mock Supabase Query Builder
class MockQueryBuilder {
  private tableName: string;
  private filters: any[] = [];
  private selectFields = '*';
  private orderBy: any[] = [];
  private limitCount?: number;
  private offsetCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  insert(data: any) {
    const newRecord = {
      id: `${this.tableName}-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString()
    };
    
    if (mockTables[this.tableName]) {
      mockTables[this.tableName].push(newRecord);
    }
    
    return Promise.resolve({
      data: [newRecord],
      error: null,
      status: 201,
      statusText: 'Created'
    });
  }

  update(data: any) {
    return Promise.resolve({
      data: [{ ...data, updated_at: new Date().toISOString() }],
      error: null,
      status: 200,
      statusText: 'OK'
    });
  }

  delete() {
    return Promise.resolve({
      data: [],
      error: null,
      status: 204,
      statusText: 'No Content'
    });
  }

  upsert(data: any) {
    return this.insert(data);
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, operator: 'like', pattern });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  offset(count: number) {
    this.offsetCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    return this.then().then(result => {
      if (result.data && result.data.length > 0) {
        return { ...result, data: result.data[0] };
      }
      return { ...result, data: null };
    });
  }

  maybeSingle() {
    return this.single();
  }

  then() {
    let data = mockTables[this.tableName] || [];

    // Apply filters
    this.filters.forEach(filter => {
      switch (filter.operator) {
        case 'eq':
          data = data.filter(item => item[filter.column] === filter.value);
          break;
        case 'neq':
          data = data.filter(item => item[filter.column] !== filter.value);
          break;
        case 'gt':
          data = data.filter(item => item[filter.column] > filter.value);
          break;
        case 'gte':
          data = data.filter(item => item[filter.column] >= filter.value);
          break;
        case 'lt':
          data = data.filter(item => item[filter.column] < filter.value);
          break;
        case 'lte':
          data = data.filter(item => item[filter.column] <= filter.value);
          break;
        case 'like':
          data = data.filter(item => 
            String(item[filter.column]).includes(filter.pattern.replace('%', ''))
          );
          break;
        case 'in':
          data = data.filter(item => filter.values.includes(item[filter.column]));
          break;
      }
    });

    // Apply ordering
    this.orderBy.forEach(order => {
      data.sort((a, b) => {
        const aVal = a[order.column];
        const bVal = b[order.column];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return order.ascending ? comparison : -comparison;
      });
    });

    // Apply offset and limit
    if (this.offsetCount) {
      data = data.slice(this.offsetCount);
    }
    if (this.limitCount) {
      data = data.slice(0, this.limitCount);
    }

    return Promise.resolve({
      data,
      error: null,
      status: 200,
      statusText: 'OK',
      count: data.length
    });
  }
}

// Mock Supabase Storage
const mockStorage = {
  from: (bucketName: string) => ({
    upload: vi.fn((path: string, file: File | Blob) => {
      mockStorageBuckets[bucketName] = mockStorageBuckets[bucketName] || {};
      mockStorageBuckets[bucketName][path] = file;
      
      return Promise.resolve({
        data: {
          path,
          id: `file-${Date.now()}`,
          fullPath: `${bucketName}/${path}`
        },
        error: null
      });
    }),
    
    download: vi.fn((path: string) => {
      const file = mockStorageBuckets[bucketName]?.[path];
      if (file) {
        return Promise.resolve({
          data: file,
          error: null
        });
      }
      return Promise.resolve({
        data: null,
        error: { message: 'File not found', status: 404 }
      });
    }),
    
    remove: vi.fn((paths: string[]) => {
      paths.forEach(path => {
        if (mockStorageBuckets[bucketName]) {
          delete mockStorageBuckets[bucketName][path];
        }
      });
      return Promise.resolve({
        data: paths.map(path => ({ name: path })),
        error: null
      });
    }),
    
    list: vi.fn((path?: string) => {
      const files = Object.keys(mockStorageBuckets[bucketName] || {})
        .filter(filePath => !path || filePath.startsWith(path))
        .map(filePath => ({
          name: filePath.split('/').pop(),
          id: `file-${filePath}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          metadata: {}
        }));
      
      return Promise.resolve({
        data: files,
        error: null
      });
    }),
    
    getPublicUrl: vi.fn((path: string) => ({
      data: {
        publicUrl: `https://test-supabase.co/storage/v1/object/public/${bucketName}/${path}`
      }
    })),
    
    createSignedUrl: vi.fn((path: string, expiresIn: number) => {
      return Promise.resolve({
        data: {
          signedUrl: `https://test-supabase.co/storage/v1/object/sign/${bucketName}/${path}?token=test-token`
        },
        error: null
      });
    })
  })
};

// Mock Supabase Auth
const mockAuth = {
  getUser: vi.fn(() => Promise.resolve({
    data: {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      }
    },
    error: null
  })),
  
  getSession: vi.fn(() => Promise.resolve({
    data: {
      session: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: {
          id: 'test-user-123',
          email: 'test@example.com'
        }
      }
    },
    error: null
  })),
  
  signInAnonymously: vi.fn(() => Promise.resolve({
    data: {
      user: {
        id: 'test-anon-user',
        is_anonymous: true
      },
      session: {
        access_token: 'test-anon-token'
      }
    },
    error: null
  })),
  
  signOut: vi.fn(() => Promise.resolve({ error: null }))
};

// Mock Supabase Edge Functions
const mockFunctions = {
  invoke: vi.fn((functionName: string, options?: any) => {
    const { body } = options || {};
    
    // TTS Proxy function
    if (functionName === 'tts-proxy') {
      return Promise.resolve({
        data: new Blob(['fake tts audio data'], { type: 'audio/mpeg' }),
        error: null
      });
    }
    
    // Google TTS function
    if (functionName === 'google-tts') {
      return Promise.resolve({
        data: {
          audioContent: 'fake-base64-audio-data',
          cost: body?.text?.length * 0.000016 || 0.001
        },
        error: null
      });
    }
    
    // Analytics function
    if (functionName === 'analytics') {
      return Promise.resolve({
        data: { success: true, eventId: `event-${Date.now()}` },
        error: null
      });
    }
    
    // Default response
    return Promise.resolve({
      data: { success: true },
      error: null
    });
  })
};

// Mock Supabase Client
export const mockSupabaseClient = {
  from: (tableName: string) => new MockQueryBuilder(tableName),
  storage: mockStorage,
  auth: mockAuth,
  functions: mockFunctions,
  
  // Real-time subscriptions (simplified)
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn()
    })),
    unsubscribe: vi.fn()
  })),
  
  // RPC calls
  rpc: vi.fn((functionName: string, params?: any) => {
    // Mock analytics aggregation
    if (functionName === 'get_user_analytics') {
      return Promise.resolve({
        data: {
          total_events: 50,
          total_cost_cents: 125,
          avg_daily_usage: 5.2
        },
        error: null
      });
    }
    
    return Promise.resolve({
      data: {},
      error: null
    });
  })
};

// Setup Supabase mocks
export function setupSupabaseMocks() {
  // Mock the Supabase module
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabaseClient)
  }));
}

// Reset Supabase mocks and data
export function resetSupabaseMocks() {
  vi.clearAllMocks();
  
  // Reset mock data
  Object.keys(mockTables).forEach(table => {
    mockTables[table] = [];
  });
  
  Object.keys(mockStorageBuckets).forEach(bucket => {
    mockStorageBuckets[bucket] = {};
  });
  
  setupSupabaseMocks();
}

// Helper functions for testing
export function getMockTableData(tableName: string) {
  return [...(mockTables[tableName] || [])];
}

export function setMockTableData(tableName: string, data: any[]) {
  mockTables[tableName] = [...data];
}

export function addMockTableRecord(tableName: string, record: any) {
  if (!mockTables[tableName]) {
    mockTables[tableName] = [];
  }
  mockTables[tableName].push({
    id: `${tableName}-${Date.now()}`,
    ...record,
    created_at: new Date().toISOString()
  });
}

export function getMockStorageFiles(bucketName: string) {
  return { ...(mockStorageBuckets[bucketName] || {}) };
}

export function setMockStorageFile(bucketName: string, path: string, file: Blob) {
  if (!mockStorageBuckets[bucketName]) {
    mockStorageBuckets[bucketName] = {};
  }
  mockStorageBuckets[bucketName][path] = file;
}