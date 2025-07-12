import { test, expect } from '@playwright/test';

test.describe('Do Not Contact (DNC) Policy Tests', () => {
  test.use({ baseURL: 'http://localhost:8181' });

  test('should allow contact when no DNC restrictions apply', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_123',
        current_company_id: 'comp_999', // Not in DNC list
        country_id: 'US', // Not in DNC list
        name: 'John Smith'
      },
      project: {
        id: 'proj_456',
        type: 'technology',
        title: 'Cloud Migration Assessment'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/can_contact', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.result).toBe(true);
  });

  test('should block contact when expert works for DNC company', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_456',
        current_company_id: 'comp_001', // Confidential Corp - in DNC list
        country_id: 'US',
        name: 'Jane Doe'
      },
      project: {
        id: 'proj_789',
        type: 'financial_services',
        title: 'Banking System Review'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/can_contact', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.result).toBe(false);
  });

  test('should block contact when expert is in sanctioned country', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_789',
        current_company_id: 'comp_888', // Not in DNC list
        country_id: 'IR', // Iran - sanctioned country
        name: 'Ali Hassan'
      },
      project: {
        id: 'proj_101',
        type: 'energy',
        title: 'Oil Refinery Optimization'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/can_contact', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.result).toBe(false);
  });

  test('should block contact for multiple DNC reasons', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_000',
        current_company_id: 'comp_002', // Competitor Industries - DNC company
        country_id: 'RU', // Russia - sanctioned country
        name: 'Vladimir Petrov'
      },
      project: {
        id: 'proj_303',
        type: 'technology',
        title: 'AI Development Project'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/can_contact', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.result).toBe(false);
  });

  test('should provide detailed decision information', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_000',
        current_company_id: 'comp_002', // DNC company
        country_id: 'RU', // DNC country
        name: 'Vladimir Petrov'
      },
      project: {
        id: 'proj_303',
        type: 'technology',
        title: 'AI Development Project'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/decision_details', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.result.can_contact).toBe(false);
    expect(result.result.dnc_reasons).toContain('dnc_company');
    expect(result.result.dnc_reasons).toContain('dnc_country');
    expect(result.result.expert_id).toBe('expert_000');
    expect(result.result.project_id).toBe('proj_303');
    expect(result.result.project_type).toBe('technology');
    expect(result.result.checks).toBeDefined();
    expect(result.result.timestamp).toBeDefined();
  });

  test('should handle invalid input gracefully', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_invalid'
        // Missing current_company_id and country_id
      },
      project: {
        id: 'proj_404'
        // Missing type
      }
    };

    const response = await request.post('/v1/data/policies/dnc/can_contact', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.result).toBe(false);
  });

  test('should provide blocked company details when applicable', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_456',
        current_company_id: 'comp_001', // Confidential Corp
        country_id: 'US',
        name: 'Jane Doe'
      },
      project: {
        id: 'proj_789',
        type: 'financial_services',
        title: 'Banking System Review'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/blocked_company', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.result).toBeDefined();
    expect(result.result.id).toBe('comp_001');
    expect(result.result.name).toBe('Confidential Corp');
    expect(result.result.reason).toBe('Client confidentiality agreement');
    expect(result.result.category).toBe('client_restriction');
  });

  test('should provide blocked country details when applicable', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_789',
        current_company_id: 'comp_888',
        country_id: 'CN', // China
        name: 'Li Wei'
      },
      project: {
        id: 'proj_101',
        type: 'technology',
        title: 'Advanced Tech Project'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/blocked_country', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.result).toBeDefined();
    expect(result.result.id).toBe('CN');
    expect(result.result.name).toBe('China');
    expect(result.result.reason).toBe('Export control restrictions');
    expect(result.result.category).toBe('export_control');
  });

  test('should validate all required input fields', async ({ request }) => {
    const input = {
      expert: {
        id: 'expert_123',
        current_company_id: 'comp_999',
        country_id: 'US',
        name: 'John Smith'
      },
      project: {
        id: 'proj_456',
        type: 'technology',
        title: 'Cloud Migration Assessment'
      }
    };

    const response = await request.post('/v1/data/policies/dnc/input_is_valid', {
      data: { input }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.result).toBe(true);
  });
});
