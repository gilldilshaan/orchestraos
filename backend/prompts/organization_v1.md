Generate an organizational structure for this objective:

Business Type: {{ compilation.business_type }}
Industry: {{ compilation.industry }}
Budget: {{ compilation.budget }}
Plan: {{ plan }}

Output JSON with departments array. Each department has:
- name: department name
- description: what this department does
- head_count: number of people needed
- budget: allocated budget
- roles: array of objects with:
  - title: role title
  - description: role description
  - responsibilities: list of responsibilities
  - required_skills: list of required skills
  - hiring_order: priority order (1 = hire first)
  - head_count: number of people in this role

Create departments that make sense for the business type and industry.
