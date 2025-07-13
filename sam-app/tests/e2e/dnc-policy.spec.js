import { test, expect } from '@playwright/test'

test.describe('Do Not Contact (DNC) Policy Tests', () => {
  test.use({ baseURL: 'http://localhost:3000' })

  test('should allow contact when no DNC restrictions apply', async ({
    request
  }) => {
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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result.can_contact).toBe(true)
  })

  test('should block contact when expert works for DNC company', async ({
    request
  }) => {
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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result.can_contact).toBe(false)
  })

  test('should block contact when expert is in sanctioned country', async ({
    request
  }) => {
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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result.can_contact).toBe(false)
  })

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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result.can_contact).toBe(false)
  })

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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result.can_contact).toBe(false)
  })

  test('should provide blocked company details when applicable', async ({
    request
  }) => {
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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()

    expect(result.result.can_contact).toBe(false)
    expect(result.result.blocked_company).toBeDefined()
    expect(result.result.blocked_company.id).toBe('comp_001')
    expect(result.result.blocked_company.name).toBe('Confidential Corp')
  })

  test('should provide blocked country details when applicable', async ({
    request
  }) => {
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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()

    expect(result.result.can_contact).toBe(false)
    expect(result.result.blocked_country).toBeDefined()
    expect(result.result.blocked_country.id).toBe('CN')
    expect(result.result.blocked_country.name).toBe('China')
  })

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
    }

    const response = await request.post('/policies/dnc', {
      data: { input },
      headers: {
        'Authorization':
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGVzIjpbInVzZXIiXX0.test',
        'Content-Type': 'application/json'
      }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result.input_is_valid).toBe(true)
  })
})
