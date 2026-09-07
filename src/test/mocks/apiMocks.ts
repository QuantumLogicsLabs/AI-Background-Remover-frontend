// Shared mock API response factories for use across tests

export const mockUser = {
  user_id: 'test-user-id-123',
  name: 'Test User',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
}

export const mockTokenResponse = {
  access_token: 'mock.jwt.token',
  token_type: 'bearer',
  user: mockUser,
}

export const mockRemoveBgResponse = {
  output_filename: 'abc123_result.png',
  download_url: '/api/download/abc123_result.png',
  quality: 'fast',
}

export const mockBatchStartResponse = {
  job_id: 'batch-job-999',
  total_files: 2,
  quality: 'fast',
  status: 'pending',
}

export const mockBatchStatusResponse = {
  job_id: 'batch-job-999',
  status: 'done',
  quality: 'fast',
  created_at: '2026-01-01T00:00:00Z',
  total: 2,
  completed: 2,
  failed: 0,
  files: [
    {
      original_name: 'img0.png',
      output_filename: 'abc_result.png',
      download_url: '/api/download/abc_result.png',
      status: 'done',
      error: null,
    },
    {
      original_name: 'img1.png',
      output_filename: 'def_result.png',
      download_url: '/api/download/def_result.png',
      status: 'done',
      error: null,
    },
  ],
}
