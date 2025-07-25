const { test, expect } = require('@playwright/test');

const OPA_URL = 'http://localhost:8181';

test.describe('Data Filter Policy Tests', () => {
  test('Admin user should get access to all documents', async ({ request }) => {
    const response = await request.post(`${OPA_URL}/v1/data/document_filter/query_filter`, {
      data: {
        input: {
          user: {
            id: 'admin_user',
            roles: ['admin']
          },
          library_id: 'library-123'
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Admin should get a bool query with empty must array (access to all)
    expect(result.result).toEqual({
      bool: {
        must: []
      }
    });
  });

  test('Employee user should get department-based filter', async ({ request }) => {
    const response = await request.post(`${OPA_URL}/v1/data/document_filter/query_filter`, {
      data: {
        input: {
          user: {
            id: 'alice',
            roles: ['employee'],
            department: 'sales'
          },
          library_id: 'library-123'
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Employee should get a bool query with library, department, and ownership filters
    expect(result.result).toEqual({
      bool: {
        must: [
          { term: { library_id: 'library-123' } }
        ],
        should: [
          { term: { department: 'sales' } },
          { term: { owner_id: 'alice' } }
        ],
        minimum_should_match: 1
      }
    });
  });

  test('Employee without department should be denied', async ({ request }) => {
    const response = await request.post(`${OPA_URL}/v1/data/document_filter/query_filter`, {
      data: {
        input: {
          user: {
            id: 'alice',
            roles: ['employee']
            // Missing department
          },
          library_id: 'library-123'
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Should get match_none (deny access)
    expect(result.result).toEqual({
      match_none: {}
    });
  });

  test('Guest user should be denied access', async ({ request }) => {
    const response = await request.post(`${OPA_URL}/v1/data/document_filter/query_filter`, {
      data: {
        input: {
          user: {
            id: 'guest_user',
            roles: ['guest']
          },
          library_id: 'library-123'
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Guest should get match_none (deny access)
    expect(result.result).toEqual({
      match_none: {}
    });
  });

  test('User with no roles should be denied access', async ({ request }) => {
    const response = await request.post(`${OPA_URL}/v1/data/document_filter/query_filter`, {
      data: {
        input: {
          user: {
            id: 'unknown_user',
            roles: []
          },
          library_id: 'library-123'
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // No roles should get match_none (deny access)
    expect(result.result).toEqual({
      match_none: {}
    });
  });

  test('Different library access for employee', async ({ request }) => {
    const response = await request.post(`${OPA_URL}/v1/data/document_filter/query_filter`, {
      data: {
        input: {
          user: {
            id: 'bob',
            roles: ['employee'],
            department: 'marketing'
          },
          library_id: 'library-456'
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Should get filter for different library
    expect(result.result).toEqual({
      bool: {
        must: [
          { term: { library_id: 'library-456' } }
        ],
        should: [
          { term: { department: 'marketing' } },
          { term: { owner_id: 'bob' } }
        ],
        minimum_should_match: 1
      }
    });
  });
});
