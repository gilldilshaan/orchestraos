"""Context-aware rule-based fallback generator used when no LLM provider is
configured (dev mode). Unlike a static canned response, this module extracts
facts from the rendered prompt (objective text, budget, industry, timeline)
and an industry profile to produce plans/risks/departments/decisions that are
tailored to the actual objective rather than identical for every request.
"""

from __future__ import annotations

import json
import re
from typing import Any

# ─── Industry profiles ──────────────────────────────────────────────────────
# Each profile drives department composition, role titles, and risk themes so
# fallback output plausibly matches the kind of business described.

_PROFILES: dict[str, dict[str, Any]] = {
    "food_beverage": {
        "label": "Food & Beverage",
        "keywords": [
            "restaurant",
            "food",
            "cafe",
            "café",
            "kitchen",
            "menu",
            "dining",
            "bakery",
            "catering",
            "coffee",
            "brewery",
            "culinary",
        ],
        "departments": [
            (
                "Culinary Operations",
                0.32,
                "Runs kitchen production, menu execution, and food quality",
                [
                    ("Executive Chef", 1, 1, ["Menu Development", "Kitchen Management"]),
                    ("Sous Chef", 2, 2, ["Food Prep", "Line Management"]),
                    ("Line Cook", 3, 4, ["Cooking", "Food Safety"]),
                ],
            ),
            (
                "Front of House",
                0.22,
                "Owns guest experience, service, and floor operations",
                [
                    ("General Manager", 1, 1, ["Operations", "Staff Scheduling"]),
                    ("Service Lead", 2, 1, ["Guest Relations", "Team Training"]),
                    ("Server", 3, 4, ["Customer Service", "POS Systems"]),
                ],
            ),
            (
                "Supply Chain & Procurement",
                0.16,
                "Manages sourcing, inventory, and vendor relationships",
                [
                    ("Procurement Manager", 1, 1, ["Vendor Negotiation", "Inventory Planning"]),
                    ("Inventory Coordinator", 2, 1, ["Stock Management", "Cost Control"]),
                ],
            ),
            (
                "Marketing & Brand",
                0.15,
                "Drives local marketing, brand, and customer acquisition",
                [
                    ("Marketing Manager", 2, 1, ["Local Marketing", "Social Media"]),
                    ("Community Manager", 3, 1, ["Social Media", "Events"]),
                ],
            ),
            (
                "Finance & Admin",
                0.15,
                "Handles accounting, payroll, and compliance",
                [("Finance Manager", 1, 1, ["Budgeting", "Payroll"])],
            ),
        ],
        "risks": [
            (
                "Food Safety & Compliance Risk",
                "operational",
                "Health code violations or a foodborne illness incident could force a shutdown",
                "Implement rigorous HACCP protocols and regular staff certification",
            ),
            (
                "Supply Chain Volatility",
                "operational",
                "Ingredient cost swings and supplier disruptions squeeze margins",
                "Diversify suppliers and lock in pricing contracts where possible",
            ),
            (
                "Location & Foot Traffic Risk",
                "market",
                "Site selection may not generate the customer volume the plan assumes",
                "Validate location with foot-traffic data before signing a lease",
            ),
            (
                "Hospitality Labor Turnover",
                "operational",
                "High turnover in kitchen and service roles drives up training costs",
                "Offer competitive wages and a clear internal growth path",
            ),
            (
                "Seasonal Demand Swings",
                "market",
                "Revenue is likely to fluctuate significantly by season",
                "Build a cash reserve and flex staffing model for low seasons",
            ),
        ],
        "phase_names": [
            "Concept & Buildout",
            "Soft Launch",
            "Grand Opening",
            "Scale & Repeat Locations",
        ],
    },
    "healthcare": {
        "label": "Healthcare",
        "keywords": [
            "health",
            "clinic",
            "medical",
            "patient",
            "hospital",
            "care",
            "therapy",
            "wellness",
            "diagnostic",
            "pharma",
        ],
        "departments": [
            (
                "Clinical Operations",
                0.35,
                "Delivers patient care and manages clinical staff",
                [
                    ("Medical Director", 1, 1, ["Clinical Oversight", "Compliance"]),
                    ("Nurse Practitioner", 2, 3, ["Patient Care", "Charting"]),
                    ("Clinical Support Staff", 3, 3, ["Patient Intake", "Scheduling"]),
                ],
            ),
            (
                "Compliance & Quality",
                0.18,
                "Ensures regulatory compliance and care quality",
                [
                    ("Compliance Officer", 1, 1, ["HIPAA", "Regulatory Filings"]),
                    ("Quality Assurance Lead", 2, 1, ["Audits", "Process Improvement"]),
                ],
            ),
            (
                "Technology & Records",
                0.17,
                "Runs EHR systems and patient data infrastructure",
                [
                    ("Health IT Manager", 1, 1, ["EHR Systems", "Data Security"]),
                    ("Systems Administrator", 2, 1, ["Infrastructure", "Support"]),
                ],
            ),
            (
                "Patient Experience",
                0.15,
                "Manages intake, billing, and patient satisfaction",
                [("Patient Services Manager", 2, 1, ["Scheduling", "Billing"])],
            ),
            (
                "Finance & Admin",
                0.15,
                "Handles insurance billing, payroll, and budgeting",
                [("Finance Manager", 1, 1, ["Insurance Billing", "Budgeting"])],
            ),
        ],
        "risks": [
            (
                "Regulatory & Compliance Risk",
                "strategic",
                "Failure to meet HIPAA or licensing requirements risks fines or closure",
                "Engage healthcare compliance counsel early and audit quarterly",
            ),
            (
                "Clinical Staffing Shortage",
                "operational",
                "Shortage of licensed clinicians could limit patient capacity",
                "Build relationships with staffing agencies and offer sign-on incentives",
            ),
            (
                "Reimbursement & Payer Risk",
                "financial",
                "Insurance reimbursement rates or denials may be lower than projected",
                "Model multiple payer-mix scenarios and diversify revenue streams",
            ),
            (
                "Patient Data Security Risk",
                "technical",
                "A data breach involving PHI would carry severe legal and reputational cost",
                "Invest in HIPAA-compliant infrastructure and regular security audits",
            ),
            (
                "Liability & Malpractice Risk",
                "strategic",
                "Clinical errors expose the organization to malpractice liability",
                "Maintain adequate malpractice insurance and clinical review boards",
            ),
        ],
        "phase_names": [
            "Licensing & Credentialing",
            "Clinical Buildout",
            "Soft Launch",
            "Full Operations",
        ],
    },
    "ecommerce_retail": {
        "label": "E-Commerce & Retail",
        "keywords": [
            "ecommerce",
            "e-commerce",
            "retail",
            "store",
            "shop",
            "marketplace",
            "d2c",
            "dtc",
            "brand",
            "product line",
        ],
        "departments": [
            (
                "Product & Merchandising",
                0.25,
                "Owns product selection, sourcing, and merchandising",
                [
                    ("Head of Product", 1, 1, ["Sourcing", "Merchandising"]),
                    ("Category Manager", 2, 2, ["Vendor Relations", "Pricing"]),
                ],
            ),
            (
                "Engineering & Platform",
                0.25,
                "Builds and maintains the storefront and checkout systems",
                [
                    ("Engineering Lead", 1, 1, ["Platform Architecture", "Payments"]),
                    ("Full-Stack Engineer", 2, 3, ["Storefront", "APIs"]),
                ],
            ),
            (
                "Growth & Marketing",
                0.20,
                "Drives customer acquisition and retention",
                [
                    ("Growth Marketing Lead", 1, 1, ["Paid Acquisition", "CRO"]),
                    ("Performance Marketer", 2, 2, ["Paid Social", "SEO"]),
                ],
            ),
            (
                "Fulfillment & Operations",
                0.15,
                "Manages warehousing, shipping, and returns",
                [("Operations Manager", 1, 1, ["Fulfillment", "Logistics"])],
            ),
            (
                "Customer Experience",
                0.15,
                "Handles support and post-purchase experience",
                [("Customer Support Lead", 2, 2, ["Support", "Retention"])],
            ),
        ],
        "risks": [
            (
                "Customer Acquisition Cost Risk",
                "market",
                "Paid acquisition costs may rise faster than projected, eroding margins",
                "Diversify acquisition channels and invest in organic/retention loops",
            ),
            (
                "Fulfillment & Logistics Risk",
                "operational",
                "Shipping delays or fulfillment errors damage customer trust",
                "Build redundancy with multiple fulfillment partners",
            ),
            (
                "Platform & Payments Risk",
                "technical",
                "Checkout downtime or payment failures directly cost revenue",
                "Use a proven commerce platform with uptime SLAs and monitoring",
            ),
            (
                "Inventory & Demand Forecasting Risk",
                "financial",
                "Overstock or stockouts tie up cash or lose sales",
                "Adopt demand forecasting tools and staged inventory commitments",
            ),
            (
                "Competitive Pressure",
                "market",
                "Larger or lower-cost competitors could undercut pricing",
                "Differentiate on brand, product quality, and customer experience",
            ),
        ],
        "phase_names": ["Platform Buildout", "Soft Launch", "Growth Ramp", "Scale & Diversify"],
    },
    "fintech": {
        "label": "Fintech & Financial Services",
        "keywords": [
            "fintech",
            "bank",
            "finance",
            "payment",
            "lending",
            "investment",
            "trading",
            "insurance",
            "wallet",
            "credit",
        ],
        "departments": [
            (
                "Engineering & Security",
                0.30,
                "Builds core platform with security and reliability first",
                [
                    ("Engineering Lead", 1, 1, ["System Architecture", "Security"]),
                    ("Backend Engineer", 2, 3, ["APIs", "Transaction Processing"]),
                    ("Security Engineer", 2, 1, ["AppSec", "Fraud Prevention"]),
                ],
            ),
            (
                "Compliance & Risk",
                0.22,
                "Manages regulatory compliance and financial risk controls",
                [
                    ("Chief Compliance Officer", 1, 1, ["Regulatory Filings", "AML/KYC"]),
                    ("Risk Analyst", 2, 1, ["Fraud Monitoring", "Credit Risk"]),
                ],
            ),
            (
                "Product",
                0.16,
                "Defines product strategy and user experience",
                [("Head of Product", 1, 1, ["Strategy", "Roadmap"])],
            ),
            (
                "Growth & Partnerships",
                0.17,
                "Drives customer acquisition and banking/payment partnerships",
                [("Growth Lead", 2, 1, ["Acquisition", "Partnerships"])],
            ),
            (
                "Finance & Treasury",
                0.15,
                "Manages capital, treasury operations, and reporting",
                [("Finance Manager", 1, 1, ["Treasury", "Reporting"])],
            ),
        ],
        "risks": [
            (
                "Regulatory Licensing Risk",
                "strategic",
                (
                    "Operating without required money-transmitter or financial "
                    "licenses halts the business"
                ),
                "Engage fintech regulatory counsel and secure licensing before launch",
            ),
            (
                "Fraud & AML Risk",
                "operational",
                "Insufficient fraud/AML controls expose the business to losses and penalties",
                "Implement KYC/AML tooling and continuous transaction monitoring",
            ),
            (
                "Data & Payments Security Risk",
                "technical",
                "A security breach of financial data would be catastrophic to trust and compliance",
                "Adopt PCI-DSS/SOC 2 controls and third-party security audits",
            ),
            (
                "Capital & Liquidity Risk",
                "financial",
                "Undercapitalization could prevent covering obligations or scaling lending",
                "Maintain liquidity reserves and secure committed credit facilities",
            ),
            (
                "Banking Partner Dependency",
                "operational",
                "Reliance on a single banking-as-a-service partner is a single point of failure",
                "Establish redundant banking partnerships",
            ),
        ],
        "phase_names": [
            "Licensing & Compliance Setup",
            "Platform Buildout",
            "Regulated Pilot",
            "Full Launch & Scale",
        ],
    },
    "education": {
        "label": "Education & EdTech",
        "keywords": [
            "education",
            "school",
            "course",
            "learning",
            "edtech",
            "student",
            "curriculum",
            "tutoring",
            "academy",
        ],
        "departments": [
            (
                "Curriculum & Instruction",
                0.30,
                "Designs curriculum and manages instructional quality",
                [
                    ("Head of Curriculum", 1, 1, ["Curriculum Design", "Assessment"]),
                    ("Instructional Designer", 2, 2, ["Content Development", "Learning Design"]),
                ],
            ),
            (
                "Engineering & Platform",
                0.22,
                "Builds and maintains the learning platform",
                [
                    ("Engineering Lead", 1, 1, ["Platform Architecture"]),
                    ("Full-Stack Engineer", 2, 2, ["LMS Development"]),
                ],
            ),
            (
                "Student Success",
                0.18,
                "Supports student engagement, retention, and outcomes",
                [("Student Success Manager", 2, 1, ["Retention", "Support"])],
            ),
            (
                "Growth & Admissions",
                0.15,
                "Drives enrollment and partnerships",
                [("Growth Lead", 2, 1, ["Enrollment", "Partnerships"])],
            ),
            (
                "Finance & Admin",
                0.15,
                "Handles tuition billing, payroll, and compliance",
                [("Finance Manager", 1, 1, ["Billing", "Budgeting"])],
            ),
        ],
        "risks": [
            (
                "Accreditation & Compliance Risk",
                "strategic",
                "Failure to secure or maintain accreditation limits credibility and enrollment",
                "Engage accreditation consultants and start the process early",
            ),
            (
                "Student Acquisition Risk",
                "market",
                "Enrollment may fall short of projections in a competitive market",
                "Diversify acquisition channels and build referral/partnership pipelines",
            ),
            (
                "Learning Outcomes Risk",
                "operational",
                "Poor learning outcomes damage reputation and retention",
                "Invest in outcome tracking and iterative curriculum improvement",
            ),
            (
                "Platform Reliability Risk",
                "technical",
                "Downtime during peak learning periods disrupts the student experience",
                "Invest in reliable infrastructure with monitoring and SLAs",
            ),
            (
                "Funding & Tuition Risk",
                "financial",
                "Tuition revenue or funding may not cover operating costs",
                "Diversify revenue with partnerships, grants, or cohort pricing",
            ),
        ],
        "phase_names": [
            "Curriculum Design",
            "Pilot Cohort",
            "Public Launch",
            "Scale & Accreditation",
        ],
    },
    "technology_software": {
        "label": "Technology & Software",
        "keywords": [
            "saas",
            "software",
            "app",
            "platform",
            "technology",
            "ai",
            "api",
            "b2b",
            "startup",
            "product",
        ],
        "departments": [
            (
                "Engineering",
                0.35,
                "Builds and maintains the product",
                [
                    ("Engineering Lead", 1, 1, ["Architecture", "Team Management"]),
                    ("Backend Engineer", 2, 3, ["API Development", "Database"]),
                    ("Frontend Engineer", 2, 2, ["UI Development", "UX"]),
                ],
            ),
            (
                "Product",
                0.15,
                "Defines product strategy and roadmap",
                [("Product Manager", 1, 1, ["Strategy", "Roadmap"])],
            ),
            (
                "Marketing & Growth",
                0.18,
                "Drives go-to-market strategy and acquisition",
                [
                    ("Marketing Lead", 3, 1, ["GTM", "Brand"]),
                    ("Growth Marketer", 3, 1, ["Paid Acquisition", "SEO"]),
                ],
            ),
            (
                "Sales & Customer Success",
                0.17,
                "Drives revenue and customer retention",
                [
                    ("Sales Lead", 3, 1, ["Pipeline", "Closing"]),
                    ("Customer Success Manager", 3, 1, ["Onboarding", "Retention"]),
                ],
            ),
            (
                "Finance & Admin",
                0.15,
                "Handles finance, legal, and operations",
                [("Finance Manager", 1, 1, ["Budgeting", "Fundraising Support"])],
            ),
        ],
        "risks": [
            (
                "Technical Execution Risk",
                "technical",
                "Engineering delays could push back the MVP or launch timeline",
                "Scope the MVP tightly and de-risk unknowns with early spikes",
            ),
            (
                "Market Adoption Risk",
                "market",
                "The target market may adopt more slowly than projected",
                "Validate demand with pilot customers before scaling spend",
            ),
            (
                "Talent Acquisition Risk",
                "operational",
                "Difficulty hiring specialized engineering or product talent",
                "Start recruitment early and consider contractors for gaps",
            ),
            (
                "Funding & Runway Risk",
                "financial",
                "Runway may be insufficient to reach the next milestone",
                "Maintain a 6-month expense buffer and track burn weekly",
            ),
            (
                "Competitive Risk",
                "market",
                "Competitors could out-execute or out-fund the initiative",
                "Focus on a defensible wedge and move quickly on differentiation",
            ),
        ],
        "phase_names": ["Foundation", "MVP Development", "Beta Launch", "Public Launch & Scale"],
    },
}

_DEFAULT_PROFILE_KEY = "technology_software"


def _classify_profile(text: str) -> str:
    text_lower = text.lower()
    best_key = _DEFAULT_PROFILE_KEY
    best_score = 0
    for key, profile in _PROFILES.items():
        score = sum(1 for kw in profile["keywords"] if kw in text_lower)
        if score > best_score:
            best_score = score
            best_key = key
    return best_key


def _extract_facts(prompt: str) -> dict[str, Any]:
    facts: dict[str, Any] = {
        "objective_text": "",
        "budget": 500_000.0,
        "budget_explicit": False,
        "industry": "",
        "business_type": "",
        "timeline_months": 12,
    }

    obj_match = re.search(r"[Oo]bjective:?\s*\n*\s*(.+)", prompt)
    if obj_match:
        facts["objective_text"] = obj_match.group(1).strip()[:500]

    budget_match = re.search(r'"total":\s*([\d.]+)', prompt)
    if budget_match:
        try:
            facts["budget"] = float(budget_match.group(1))
            facts["budget_explicit"] = True
        except ValueError:
            pass
    else:
        # Look for a plain-language budget mention, e.g. "$250,000" or "$2 million"
        dollar_match = re.search(r"\$\s*([\d,.]+)\s*(million|m|k|thousand)?", prompt, re.IGNORECASE)
        if dollar_match:
            try:
                value = float(dollar_match.group(1).replace(",", ""))
                unit = (dollar_match.group(2) or "").lower()
                if unit in ("million", "m"):
                    value *= 1_000_000
                elif unit in ("k", "thousand"):
                    value *= 1_000
                facts["budget"] = value
                facts["budget_explicit"] = True
            except ValueError:
                pass

    industry_match = re.search(r'"industry":\s*"([^"]*)"', prompt)
    if industry_match:
        facts["industry"] = industry_match.group(1)

    biztype_match = re.search(r'"business_type":\s*"([^"]*)"', prompt)
    if biztype_match:
        facts["business_type"] = biztype_match.group(1)

    months_match = re.search(r'"total_months":\s*(\d+)', prompt)
    if months_match:
        facts["timeline_months"] = int(months_match.group(1))

    return facts


def _confidence(facts: dict[str, Any], bonus: float = 0.0) -> float:
    score = 0.55
    if facts.get("industry") or facts.get("business_type"):
        score += 0.1
    if facts.get("budget_explicit"):
        score += 0.1
    if len(facts.get("objective_text", "")) > 40:
        score += 0.1
    return round(min(score + bonus, 0.95), 2)


def _profile_for(facts: dict[str, Any]) -> dict[str, Any]:
    classify_text = " ".join(
        [
            facts.get("objective_text", ""),
            facts.get("industry", ""),
            facts.get("business_type", ""),
        ]
    )
    key = _classify_profile(classify_text)
    return _PROFILES[key]


def _summarize_objective(facts: dict[str, Any]) -> str:
    text = str(facts.get("objective_text", "")).strip()
    if not text:
        return "the stated objective"
    return text[:120] + ("..." if len(text) > 120 else "")


# ─── Fallback builders ──────────────────────────────────────────────────────


def build_compile(prompt: str) -> dict[str, Any]:
    obj_match = re.search(
        r"objective:\s*\n*\s*(.+?)\n\nOutput JSON", prompt, re.IGNORECASE | re.DOTALL
    )
    objective_text = obj_match.group(1).strip() if obj_match else prompt[:300]
    facts = {"objective_text": objective_text, "budget_explicit": False}
    dollar_match = re.search(
        r"\$\s*([\d,.]+)\s*(million|m|k|thousand)?", objective_text, re.IGNORECASE
    )
    budget = 500_000.0
    if dollar_match:
        try:
            budget = float(dollar_match.group(1).replace(",", ""))
            unit = (dollar_match.group(2) or "").lower()
            if unit in ("million", "m"):
                budget *= 1_000_000
            elif unit in ("k", "thousand"):
                budget *= 1_000
            facts["budget_explicit"] = True
        except ValueError:
            pass

    profile = _profile_for({"objective_text": objective_text, "industry": "", "business_type": ""})
    summary = _summarize_objective({"objective_text": objective_text})

    label_lower = profile["label"].lower()
    return {
        "mission": f"Successfully launch and grow: {summary}",
        "vision": (
            f"Become a trusted, sustainable leader in {label_lower} "
            "by delivering on this objective."
        ),
        "business_type": profile["label"],
        "industry": profile["label"],
        "stakeholders": [
            {"name": "Executive Sponsor", "role": "sponsor"},
            {"name": "Operating Team", "role": "builder"},
            {"name": "Customers/Users", "role": "beneficiary"},
        ],
        "constraints": [
            "Budget constraints",
            "Time-to-launch constraints",
            "Hiring/staffing constraints",
        ],
        "kpis": [
            {"name": "Revenue", "target": str(round(budget * 2))},
            {"name": "Customer/User Growth", "target": "10000"},
        ],
        "timeline": {"total_months": 12, "phases": len(profile["phase_names"])},
        "budget": {"total": budget, "currency": "USD"},
        "dependencies": ["Team hiring", "Initial funding secured"],
        "assumptions": ["Stable market conditions", "Budget is available as stated"],
        "risks": [
            {"title": profile["risks"][0][0], "probability": 0.4, "impact": 0.6},
        ],
        "success_metrics": [{"name": "Objective delivered on time and budget", "target": "100%"}],
        "recommendation": f"Proceed with a phased execution plan tailored to {label_lower}",
        "reasoning": (
            "A phased approach reduces risk while validating assumptions "
            "specific to this business type."
        ),
        "evidence": [
            f"Objective classified as {profile['label']}",
            f"Estimated budget ${budget:,.0f}",
        ],
        "confidence": _confidence(facts),
        "risk_level": "medium",
    }


def build_plan(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    profile = _profile_for(facts)
    budget = facts["budget"]
    months = facts["timeline_months"]
    phase_names = profile["phase_names"]
    per_phase_months = max(1, months // len(phase_names))

    phases = []
    milestones = []
    for i, name in enumerate(phase_names, start=1):
        phase_milestones = [f"{name} kickoff", f"{name} complete"]
        phases.append(
            {
                "phase_number": i,
                "name": name,
                "duration_months": per_phase_months,
                "milestones": phase_milestones,
            }
        )
        milestones.append(
            {
                "name": f"{name} Complete",
                "description": f"Finish {name.lower()} for {_summarize_objective(facts)}",
                "order": i,
                "status": "pending",
                "dependencies": [phase_names[i - 2]] if i > 1 else [],
                "kpis": [f"{name} exit criteria met"],
            }
        )

    return {
        "roadmap": {
            "phases": phases,
            "description": f"Phased roadmap for {_summarize_objective(facts)}",
        },
        "timeline": {"total_months": months, "start_date": "2026-08-01"},
        "total_cost": round(budget * 0.9, 2),
        "confidence": _confidence(facts),
        "milestones": milestones,
        "recommendation": (
            f"Execute a {len(phase_names)}-phase plan tailored to {profile['label'].lower()}"
        ),
        "reasoning": (
            f"Phasing the plan into {name_join(phase_names)} lets the team validate "
            f"assumptions specific to {profile['label'].lower()} before committing "
            f"the full ${budget:,.0f} budget."
        ),
        "evidence": [
            f"Industry profile: {profile['label']}",
            f"Budget: ${budget:,.0f}",
            f"Timeline: {months} months",
        ],
        "risk_level": "medium",
        "assumptions": [
            "Budget and timeline as provided are accurate",
            "Key hires can be made on schedule",
        ],
    }


def name_join(names: list[str]) -> str:
    if len(names) <= 1:
        return names[0] if names else ""
    return ", ".join(names[:-1]) + f", and {names[-1]}"


def build_risk(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    profile = _profile_for(facts)
    risks = []
    for title, category, description, mitigation in profile["risks"]:
        probability = 0.5
        impact = 0.6
        risks.append(
            {
                "title": title,
                "description": description,
                "category": category,
                "probability": probability,
                "impact": impact,
                "risk_level": "high" if probability * impact > 0.4 else "medium",
                "risk_score": round(probability * impact, 2),
                "mitigation": mitigation,
                "contingency": f"Escalate to leadership if {title.lower()} materializes",
                "owner": "Operations Lead",
            }
        )

    top_risk_title = risks[0]["title"].lower()
    return {
        "risks": risks,
        "recommendation": f"Prioritize mitigating {top_risk_title} first given its impact",
        "reasoning": (
            f"Risks identified reflect the specific challenges of "
            f"{profile['label'].lower()} ventures."
        ),
        "evidence": [r["title"] for r in risks],
        "confidence": _confidence(facts),
        "risk_level": "high" if any(r["risk_level"] == "high" for r in risks) else "medium",
        "assumptions": ["Risk profile reflects industry norms for " + profile["label"]],
        "affected_departments": [d[0] for d in profile["departments"][:2]],
    }


def build_organization(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    profile = _profile_for(facts)
    budget = facts["budget"]

    departments = []
    for name, budget_ratio, description, roles in profile["departments"]:
        dept_budget = round(budget * budget_ratio, 2)
        head_count = sum(r[2] for r in roles)
        role_entries = [
            {
                "title": title,
                "description": f"{title} within {name}",
                "responsibilities": skills,
                "required_skills": skills,
                "hiring_order": hiring_order,
                "head_count": count,
            }
            for title, hiring_order, count, skills in roles
        ]
        departments.append(
            {
                "name": name,
                "description": description,
                "head_count": head_count,
                "budget": dept_budget,
                "roles": role_entries,
            }
        )

    label_lower = profile["label"].lower()
    return {
        "departments": departments,
        "recommendation": (
            f"Structure the organization around {len(departments)} core functions "
            f"for {label_lower}"
        ),
        "reasoning": (
            f"This structure mirrors proven organizational patterns for {label_lower} "
            "ventures at this budget scale."
        ),
        "evidence": [
            f"Total budget allocated: ${budget:,.0f}",
            f"Departments: {', '.join(d['name'] for d in departments)}",
        ],
        "confidence": _confidence(facts),
        "risk_level": "medium",
        "assumptions": [
            "Hiring proceeds in the stated order",
            "Budget ratios reflect industry norms",
        ],
    }


def build_decision(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    profile = _profile_for(facts)
    budget = facts["budget"]
    label_lower = profile["label"].lower()

    return {
        "recommendation": (
            f"Proceed with a phased launch tailored to {label_lower}, "
            "starting with a scoped pilot"
        ),
        "reasoning": (
            f"A phased approach minimizes risk while validating assumptions specific to "
            f"{profile['label'].lower()}. It also matches the available budget of ${budget:,.0f} "
            "by deferring capital-intensive scaling until initial traction is proven."
        ),
        "evidence": [
            f"Industry profile: {profile['label']}",
            f"Available budget: ${budget:,.0f}",
            "Phased approaches reduce capital at risk before validation",
        ],
        "confidence": _confidence(facts),
        "risk_level": "medium",
        "affected_departments": [d[0] for d in profile["departments"][:3]],
        "options": [
            {
                "name": "Phased Pilot Approach",
                "description": f"Launch a scoped pilot before full {label_lower} rollout",
                "pros": [
                    "Lower capital at risk",
                    "Faster time-to-validation",
                    "Easier to course-correct",
                ],
                "cons": ["Slower path to full scale"],
                "risks": [profile["risks"][0][0]],
                "cost": round(budget * 0.4, 2),
                "timeline_impact": "Adds 4-6 weeks to reach full scale but reduces failure risk",
                "confidence": _confidence(facts, bonus=0.05),
                "is_recommended": True,
            },
            {
                "name": "Full-Scale Launch",
                "description": (
                    f"Commit the full budget to a complete {label_lower} build-out immediately"
                ),
                "pros": ["Fastest path to full market presence"],
                "cons": ["Higher capital risk", "No validation checkpoint", "Harder to pivot"],
                "risks": [r[0] for r in profile["risks"][:2]],
                "cost": round(budget * 0.95, 2),
                "timeline_impact": "Shortest nominal timeline but highest execution risk",
                "confidence": round(_confidence(facts) - 0.25, 2),
                "is_recommended": False,
            },
        ],
        "assumptions": ["Budget and timeline as provided are accurate"],
    }


def build_devils_advocate(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    profile = _profile_for(facts)
    budget = facts["budget"]

    top_risk = profile["risks"][0][0]
    return {
        "critique_score": 62,
        "counter_arguments": [
            {
                "argument": f"The plan may underestimate {top_risk.lower()}",
                "challenge": (
                    f"What specific evidence supports the assumption that "
                    f"{top_risk.lower()} is manageable?"
                ),
                "severity": "high",
            },
            {
                "argument": (
                    f"A budget of ${budget:,.0f} may be tight for {profile['label'].lower()}"
                ),
                "challenge": (
                    "What is the contingency plan if actual costs exceed this budget by 20%?"
                ),
                "severity": "medium",
            },
        ],
        "risks": [
            {"risk": r[0], "likelihood": 0.5, "impact": 0.6, "is_overlooked": i > 0}
            for i, r in enumerate(profile["risks"][:3])
        ],
        "assumptions": [
            {
                "assumption": "The target market will adopt at the projected rate",
                "is_unrealistic": True,
                "reason": "No independent validation data was provided",
            },
            {
                "assumption": "Key hires can be made within the planned timeline",
                "is_unrealistic": False,
                "reason": f"Typical for {profile['label'].lower()} hiring timelines",
            },
        ],
        "better_alternatives": [
            {
                "alternative": "Run a smaller pilot before committing the full budget",
                "rationale": "Validates core assumptions with limited capital at risk",
                "expected_improvement": "Meaningfully lower failure risk",
            },
        ],
        "recommendations": [
            f"Build a contingency reserve of at least 20% of the ${budget:,.0f} budget",
            f"Validate demand before committing to full {profile['label'].lower()} scale",
            "Define explicit go/no-go checkpoints between phases",
        ],
        "reasoning": (
            f"This critique stress-tests the plan against known failure modes "
            f"for {profile['label'].lower()} ventures."
        ),
        "evidence": [r[0] for r in profile["risks"]],
        "confidence": 0.8,
        "risk_level": "high",
    }


def build_dependency_graph(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    profile = _profile_for(facts)
    phase_names = profile["phase_names"]

    nodes = [
        {"id": f"phase-{i + 1}", "type": "milestone", "name": name, "properties": {"order": i + 1}}
        for i, name in enumerate(phase_names)
    ]
    for j, (dept_name, *_rest) in enumerate(profile["departments"][:2]):
        nodes.append({"id": f"dept-{j + 1}", "type": "department", "name": dept_name})

    edges = [
        {
            "source": f"phase-{i + 1}",
            "target": f"phase-{i + 2}",
            "relationship_type": "depends_on",
            "weight": 1.0,
        }
        for i in range(len(phase_names) - 1)
    ]
    edges.append(
        {
            "source": "dept-1",
            "target": "phase-2",
            "relationship_type": "responsible_for",
            "weight": 0.8,
        }
    )

    critical_path = [
        {
            "step": i + 1,
            "node_id": f"phase-{i + 1}",
            "description": f"{name} must complete before the next phase",
        }
        for i, name in enumerate(phase_names)
    ]

    return {
        "nodes": nodes,
        "edges": edges,
        "critical_path": critical_path,
        "circular_dependencies": [],
        "blocked_tasks": [
            {
                "task": phase_names[1],
                "blocked_by": phase_names[0],
                "impact": "Delays cascade to every subsequent phase",
                "unblock_action": f"Prioritize completing {phase_names[0].lower()} on schedule",
            },
        ],
        "cascade_effects": [
            {
                "trigger": f"{phase_names[0]} delay",
                "affected": "All subsequent phases",
                "severity": "high",
                "description": (
                    f"A delay in {phase_names[0].lower()} pushes back the entire roadmap"
                ),
            },
        ],
        "recommendation": (
            f"Treat {phase_names[0]} as the critical path and protect its timeline first"
        ),
        "reasoning": (
            f"The {len(phase_names)}-phase structure for {profile['label'].lower()} "
            "is strictly sequential."
        ),
        "confidence": _confidence(facts),
        "risk_level": "medium",
    }


def build_dashboard(prompt: str) -> dict[str, Any]:
    risks_match = re.search(r'"?risks_count"?["\s:]+(\d+)', prompt)
    pending_match = re.search(r'"?pending_decisions"?["\s:]+(\d+)', prompt)
    milestones_match = re.search(r'"?milestones_count"?["\s:]+(\d+)', prompt)
    risks_count = int(risks_match.group(1)) if risks_match else 0
    pending_decisions = int(pending_match.group(1)) if pending_match else 0
    milestones_count = int(milestones_match.group(1)) if milestones_match else 0

    alerts = []
    status = "on_track"
    if risks_count >= 3:
        alerts.append(f"{risks_count} open risks identified — review mitigation plans")
        status = "at_risk"
    if pending_decisions >= 1:
        alerts.append(f"{pending_decisions} decision(s) awaiting approval")
        status = "at_risk" if status == "on_track" else status

    progress = min(90, 10 + milestones_count * 15)

    return {
        "summary": (
            f"{milestones_count} milestone(s) tracked, {risks_count} open risk(s), "
            f"{pending_decisions} decision(s) pending approval."
        ),
        "progress_percent": progress,
        "status": status,
        "alerts": alerts or ["No active alerts"],
        "recommendation": (
            "Resolve pending decisions before advancing to the next phase"
            if pending_decisions
            else "Continue executing the current plan"
        ),
        "reasoning": "Status derived from current milestone, risk, and decision counts.",
        "confidence": 0.7,
        "risk_level": "high" if status == "at_risk" and risks_count >= 3 else "medium",
    }


_ROLE_THEMES: dict[str, tuple[str, str, float]] = {
    "Planner": (
        "execution sequencing, milestones, and delivery feasibility",
        "the plan sequencing and milestone dependencies hold together for this objective",
        0.62,
    ),
    "Engineering": (
        "technical feasibility and delivery risk",
        "the engineering delivery path is realistic for the given timeline",
        0.68,
    ),
    "Finance": (
        "budget adequacy, unit economics, and ROI",
        "the budget covers realistic costs with a defensible contingency",
        0.58,
    ),
    "Marketing": (
        "market traction and adoption",
        "there is plausible demand to justify the go-to-market spend",
        0.65,
    ),
    "Legal": (
        "compliance, regulatory exposure, and liability",
        "the compliance and contracting path is clean for this objective",
        0.6,
    ),
    "Risk": (
        "exposure, uncertainty, and mitigation coverage",
        "key risks have named owners and mitigations before we commit",
        0.55,
    ),
    "Operations": (
        "capacity, staffing, and operational readiness",
        "operations can actually stand up the work inside the timeline",
        0.6,
    ),
}

_DEFAULT_THEME = (
    "strategic alignment and delivery confidence",
    "the initiative aligns with strategy and can be delivered",
    0.65,
)


def _board_role(prompt: str) -> str:
    match = re.search(r"You are ([A-Za-z ]+),", prompt)
    if match:
        return match.group(1).strip()
    return "CEO"


def _board_theme(prompt: str) -> tuple[str, str, float]:
    role = _board_role(prompt)
    return _ROLE_THEMES.get(role, _DEFAULT_THEME)


def build_board_opening(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    role = _board_role(prompt)
    theme, _claim, conf = _board_theme(prompt)
    summary = _summarize_objective(facts)
    return {
        "title": f"{role}: initial read on {summary}",
        "summary": (
            f"From a {role} lens, the initiative is sound in principle but lives or dies on "
            f"{theme}. I can support it if the board addresses the items below."
        ),
        "stance": "conditional",
        "key_points": [
            f"Objective is clear: {summary}",
            f"{role} scope and accountabilities need to be explicit before kickoff",
            "Timing and sequencing must be locked in this session",
        ],
        "concerns": [
            f"{role} risk is unstated in the brief and needs a concrete number",
            "No mitigation for schedule or budget slippage is visible yet",
            "Dependencies on other executives are not load-balanced",
        ],
        "questions": [
            "What is the confirmed budget with contingency for this phase?",
            "Which milestone is the board treating as the go/no-go checkpoint?",
        ],
        "confidence": conf,
    }


def build_board_deliberation(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    role = _board_role(prompt)
    _theme, claim, conf = _board_theme(prompt)
    summary = _summarize_objective(facts)
    return {
        "title": f"{role} deliberation on {summary}",
        "summary": (
            f"After reviewing the openings, I hold the same position: {claim}. "
            "Several colleagues overstated confidence; I need tighter numbers before I move."
        ),
        "stance_now": "conditional",
        "agreements": [
            "The board generally agrees the objective is achievable",
            "The sequencing in the openings is broadly consistent",
        ],
        "challenges": [
            {
                "target": "Finance",
                "point": f"The budget has no stated contingency — inflate it for {summary}",
            },
            {
                "target": "Planner",
                "point": "The milestone checkpoints are too late to catch failure cheaply",
            },
        ],
        "questions": [
            {"target": "Finance", "question": "What is the contingency number on the budget?"},
            {"target": "Planner", "question": "Which milestone is the true go/no-go?"},
        ],
        "conditions": [
            "Add a named contingency budget",
            "Insert an earlier go/no-go checkpoint",
        ],
        "confidence": conf,
    }


def build_board_response(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    role = _board_role(prompt)
    _theme, _claim, conf = _board_theme(prompt)
    summary = _summarize_objective(facts)
    return {
        "title": f"{role} answers the board",
        "summary": (
            f"On the points raised at me: I hold my ground on the principle for {summary} "
            "but concede the budget line needs a contingency number, which I am happy to take."
        ),
        "answers": [
            {"question": "contingency on the budget", "answer": "Add 15% contingency as the default"},
            {"question": "tight checkpoints", "answer": "Bring the go/no-go checkpoint forward one milestone"},
        ],
        "stance_now": "conditional",
        "concessions": ["Budget requires a stated contingency"],
        "remaining_concerns": ["Schedule slip protection is still light"],
        "escalation": False,
        "escalate_reason": "",
        "confidence": conf,
    }


def _board_vote(role: str) -> str:
    return {
        "Finance": "conditional",
        "Risk": "conditional",
        "Legal": "approve",
        "Engineering": "approve",
        "Marketing": "approve",
        "Planner": "conditional",
        "Operations": "approve",
        "CEO": "approve",
    }.get(role, "approve")


def build_board_vote(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    role = _board_role(prompt)
    vote = _board_vote(role)
    summary = _summarize_objective(facts)
    return {
        "title": f"{role} vote on {summary}",
        "summary": (
            f"Based on the deliberation, {role} votes {vote} for {summary}, "
            "with confidence in the plan behind it."
        ),
        "vote": vote,
        "stance": "support" if vote == "approve" else "conditional",
        "reasoning": (
            f"the plan is deliverable, {vote} with conditions"
            if vote == "conditional"
            else "the plan is clear, funded, and can proceed"
        ),
        "conditions": (
            ["15% budget contingency", "named mitigation for the top risk"]
            if vote == "conditional"
            else []
        ),
        "confidence": 0.62 if vote == "conditional" else 0.75,
    }


def build_board_consensus(prompt: str) -> dict[str, Any]:
    facts = _extract_facts(prompt)
    summary = _summarize_objective(facts)
    vote_counts: dict[str, int] = {}
    for match in re.finditer(r'"vote":\s*"(\w+)"', prompt):
        vote_counts[match.group(1)] = vote_counts.get(match.group(1), 0) + 1

    conditional = vote_counts.get("conditional", 0)
    rejects = vote_counts.get("reject", 0)

    if rejects > 0:
        verdict, mood = "conditional", "divided"
    elif conditional > 0:
        verdict, mood = "conditional", "consensus"
    else:
        verdict, mood = "approve", "consensus"

    return {
        "title": f"Board consensus on {summary}",
        "decision": (
            f"The board approves {summary} with conditions: name budget contingency, "
            "earlier go/no-go, and named mitigations before full commitment."
        ),
        "verdict": verdict,
        "mood": mood,
        "rationale": (
            f"The roll call shows {conditional} conditional and {rejects} reject votes; "
            "conditions are adoptable, so the board proceeds on a conditional basis."
        ),
        "adopted_conditions": [
            "15% budget contingency reserve",
            "Go/no-go moved one milestone earlier",
            "named mitigation owner for the top risk",
        ],
        "action_items": [
            "Lock the budget with contingency",
            "Publish go/no-go checkpoint cadence",
            "Assign mitigation owners",
            "Re-convene if the checkpoint is missed",
        ],
        "minority_reports": [
            {
                "who": "Risk",
                "point": "wants mitigation ownership explicit before approval",
            }
        ]
        if rejects > 0
        else [],
        "overall_confidence": round(0.62 + 0.05 * (rejects == 0), 2),
    }


_BUILDERS = {
    "compile": build_compile,
    "plan": build_plan,
    "risk": build_risk,
    "organization": build_organization,
    "decision": build_decision,
    "devils_advocate": build_devils_advocate,
    "dependency_graph": build_dependency_graph,
    "dashboard": build_dashboard,
    "board_opening": build_board_opening,
    "board_deliberation": build_board_deliberation,
    "board_response": build_board_response,
    "board_vote": build_board_vote,
    "board_consensus": build_board_consensus,
}


def generate(prompt: str, task_type: str | None = None) -> str:
    """Route a rendered prompt to a context-aware fallback builder.

    Prefers exact routing via `task_type` (passed by AIKernel, which always
    knows it) over sniffing the prompt text. Keyword sniffing is kept only as
    a fallback for direct llm_client.generate() callers that don't pass
    task_type — several prompt templates share substrings (e.g. both
    devils_advocate_v1.md and dependency_graph_v1.md render "Plan:" and
    "Milestones:" sections), so keyword-only routing is not reliable.
    """
    if task_type and task_type in _BUILDERS:
        return json.dumps(_BUILDERS[task_type](prompt))

    prompt_lower = prompt.lower()

    if "compil" in prompt_lower or ("objective" in prompt_lower and "extract" in prompt_lower):
        return json.dumps(_BUILDERS["compile"](prompt))
    if "devil" in prompt_lower or "advocate" in prompt_lower:
        return json.dumps(_BUILDERS["devils_advocate"](prompt))
    if "dependency graph" in prompt_lower or "dependencies" in prompt_lower:
        return json.dumps(_BUILDERS["dependency_graph"](prompt))
    if (
        "dashboard" in prompt_lower
        or "summarize" in prompt_lower
        or "execution status" in prompt_lower
    ):
        return json.dumps(_BUILDERS["dashboard"](prompt))
    if "roadmap" in prompt_lower or ("plan" in prompt_lower and "milestone" in prompt_lower):
        return json.dumps(_BUILDERS["plan"](prompt))
    if "risk" in prompt_lower:
        return json.dumps(_BUILDERS["risk"](prompt))
    if "organi" in prompt_lower or "department" in prompt_lower:
        return json.dumps(_BUILDERS["organization"](prompt))
    if (
        "decision" in prompt_lower
        or "recommend" in prompt_lower
        or "strategic options" in prompt_lower
    ):
        return json.dumps(_BUILDERS["decision"](prompt))

    return ""
