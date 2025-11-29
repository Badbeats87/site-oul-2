# GitHub Setup Guide - Vinyl Catalog System

Complete guide for setting up GitHub project management, automation, and visibility for the Vinyl Catalog System.

## Table of Contents
1. [GitHub Projects Setup](#1-github-projects-setup)
2. [Issue Labels System](#2-issue-labels-system)
3. [Milestones Structure](#3-milestones-structure)
4. [Branch Protection Rules](#4-branch-protection-rules)
5. [CI/CD and Status Checks](#5-cicd-and-status-checks)
6. [GitHub Discussions](#6-github-discussions)
7. [Wiki Structure](#7-wiki-structure)
8. [Status Badges](#8-status-badges)
9. [Automation Workflows](#9-automation-workflows)

---

## 1. GitHub Projects Setup

### Creating the Project Board

1. Navigate to your repository: `https://github.com/Badbeats87/site-oul-2`
2. Click **Projects** tab
3. Click **New project**
4. Choose **Board** layout
5. Name: "Vinyl Catalog Development"
6. Description: "Main development board for the Vinyl Catalog buy/sell platform"

### Board Columns Configuration

Create these columns in order:

| Column Name | Purpose | Automation |
|------------|---------|------------|
| **Backlog** | Prioritized work not yet started | Manual |
| **Ready** | Issues ready to be worked on | Auto: Issues with "ready" label |
| **In Progress** | Active development | Auto: PRs opened, Issues assigned |
| **Code Review** | PRs awaiting review | Auto: PRs ready for review |
| **Testing** | Features in QA/testing | Auto: PRs with "testing" label |
| **Done** | Completed work | Auto: Issues closed, PRs merged |

### Setting Up Automation

For each column, click the **...** menu and configure automations:

**Backlog**
- No automation (manually curate)

**Ready**
- Preset: None (manual organization)

**In Progress**
- Preset: "To do" → Auto-move issues when assigned
- Preset: "In progress" → Auto-move PRs when opened

**Code Review**
- Preset: Auto-move PRs ready for review

**Testing**
- Custom: Add items with label "needs-testing"

**Done**
- Preset: Auto-move closed issues
- Preset: Auto-move merged PRs

### Custom Fields

Add these custom fields to track additional metadata:

1. **Priority** (Single select)
   - Critical
   - High
   - Medium
   - Low

2. **Effort** (Single select)
   - XS (< 1 day)
   - S (1-2 days)
   - M (3-5 days)
   - L (1-2 weeks)
   - XL (2+ weeks)

3. **Component** (Single select)
   - Seller Site
   - Buyer Storefront
   - Admin Console
   - Pricing Engine
   - API/Backend
   - Database
   - Infrastructure

4. **Sprint** (Text)
   - Sprint 1, Sprint 2, etc.

5. **Target Date** (Date)
   - Optional deadline

### Views Configuration

Create multiple views for different perspectives:

**View 1: Sprint Board (Default)**
- Layout: Board
- Group by: Status
- Filter: Current sprint items
- Sort: Priority (High to Low)

**View 2: Component View**
- Layout: Table
- Group by: Component
- Filter: Status != Done
- Sort: Priority

**View 3: Priority Matrix**
- Layout: Board
- Group by: Priority
- Filter: Status = Backlog or Ready
- Sort: Effort

**View 4: Roadmap**
- Layout: Roadmap
- Group by: Milestone
- Show: All issues with target dates

### Project-Level Automation Workflows

Enable these built-in workflows:

1. **Item added to project**: Set status to "Backlog"
2. **Item closed**: Move to "Done", mark date completed
3. **Pull request merged**: Move to "Done"
4. **Code review approved**: Add comment, move to "Testing"

---

## 2. Issue Labels System

### Creating Labels

Navigate to: **Issues** → **Labels** → **New label**

Create the following label structure:

### Type Labels (prefix: `type:`)

```
type: feature          #0e8a16   New feature or capability
type: enhancement      #a2eeef   Improvement to existing functionality
type: bug              #d73a4a   Defect that needs fixing
type: hotfix           #b60205   Critical bug requiring immediate fix
type: documentation    #0075ca   Documentation updates
type: refactor         #fbca04   Code refactoring (no functional change)
type: technical-debt   #e99695   Technical debt or cleanup work
```

### Component Labels (prefix: `component:`)

```
component: seller-site       #c5def5   Seller-facing "Sell to Us" site
component: buyer-storefront  #bfdadc   Buyer-facing "Buy from Us" storefront
component: admin-console     #fef2c0   Internal admin console
component: pricing-engine    #f9d0c4   Pricing calculation and policies
component: api               #d4c5f9   Backend API and services
component: database          #c2e0c6   Database schema and migrations
component: integrations      #fad8c7   External API integrations (Discogs/eBay)
component: infrastructure    #bfd4f2   DevOps, deployment, hosting
```

### Domain Labels (prefix: `domain:`)

```
domain: pricing        #fbca04   Pricing strategy and calculations
domain: inventory      #0e8a16   Inventory management
domain: submissions    #1d76db   Seller submissions and quotes
domain: catalog        #5319e7   Catalog metadata and search
domain: checkout       #e99695   Checkout and payment flow
domain: shipping       #f9d0c4   Shipping and fulfillment
domain: notifications  #bfdadc   Email/SMS notifications
domain: auth           #d93f0b   Authentication and authorization
```

### Priority Labels (prefix: `priority:`)

```
priority: critical    #b60205   Critical path, blocks release
priority: high        #d93f0b   Important, should be next
priority: medium      #fbca04   Normal priority
priority: low         #0e8a16   Nice to have, future work
```

### Status Labels (prefix: `status:`)

```
status: blocked       #e99695   Blocked by dependencies
status: needs-info    #d876e3   Requires more information
status: ready         #0e8a16   Ready to be worked on
status: needs-testing #fbca04   Needs QA/testing
status: needs-review  #c5def5   Needs code review
status: wontfix       #ffffff   Will not be fixed
status: duplicate     #cfd3d7   Duplicate issue
```

### Effort Labels (prefix: `effort:`)

```
effort: xs    #c2e0c6   < 1 day
effort: s     #bfdadc   1-2 days
effort: m     #fef2c0   3-5 days
effort: l     #f9d0c4   1-2 weeks
effort: xl    #e99695   2+ weeks
```

### Special Labels

```
good-first-issue      #7057ff   Good for newcomers
help-wanted           #008672   Extra attention needed
breaking-change       #d93f0b   Breaks backward compatibility
security              #b60205   Security-related issue
performance           #fbca04   Performance improvement
accessibility         #0e8a16   Accessibility improvement
epic                  #3e4b9e   Large feature spanning multiple issues
```

### Batch Label Creation Script

Create labels using GitHub CLI:

```bash
# Navigate to your repository
cd /Users/invision/site-oul-2

# Type labels
gh label create "type: feature" -c "0e8a16" -d "New feature or capability"
gh label create "type: enhancement" -c "a2eeef" -d "Improvement to existing functionality"
gh label create "type: bug" -c "d73a4a" -d "Defect that needs fixing"
gh label create "type: hotfix" -c "b60205" -d "Critical bug requiring immediate fix"
gh label create "type: documentation" -c "0075ca" -d "Documentation updates"
gh label create "type: refactor" -c "fbca04" -d "Code refactoring"
gh label create "type: technical-debt" -c "e99695" -d "Technical debt or cleanup"

# Component labels
gh label create "component: seller-site" -c "c5def5" -d "Seller 'Sell to Us' site"
gh label create "component: buyer-storefront" -c "bfdadc" -d "Buyer 'Buy from Us' storefront"
gh label create "component: admin-console" -c "fef2c0" -d "Internal admin console"
gh label create "component: pricing-engine" -c "f9d0c4" -d "Pricing calculation and policies"
gh label create "component: api" -c "d4c5f9" -d "Backend API and services"
gh label create "component: database" -c "c2e0c6" -d "Database schema and migrations"
gh label create "component: integrations" -c "fad8c7" -d "External APIs (Discogs/eBay)"
gh label create "component: infrastructure" -c "bfd4f2" -d "DevOps and deployment"

# Domain labels
gh label create "domain: pricing" -c "fbca04" -d "Pricing strategy"
gh label create "domain: inventory" -c "0e8a16" -d "Inventory management"
gh label create "domain: submissions" -c "1d76db" -d "Seller submissions"
gh label create "domain: catalog" -c "5319e7" -d "Catalog metadata"
gh label create "domain: checkout" -c "e99695" -d "Checkout and payment"
gh label create "domain: shipping" -c "f9d0c4" -d "Shipping and fulfillment"
gh label create "domain: notifications" -c "bfdadc" -d "Email/SMS notifications"
gh label create "domain: auth" -c "d93f0b" -d "Authentication"

# Priority labels
gh label create "priority: critical" -c "b60205" -d "Critical, blocks release"
gh label create "priority: high" -c "d93f0b" -d "Important, next priority"
gh label create "priority: medium" -c "fbca04" -d "Normal priority"
gh label create "priority: low" -c "0e8a16" -d "Nice to have"

# Status labels
gh label create "status: blocked" -c "e99695" -d "Blocked by dependencies"
gh label create "status: needs-info" -c "d876e3" -d "Needs more information"
gh label create "status: ready" -c "0e8a16" -d "Ready to work on"
gh label create "status: needs-testing" -c "fbca04" -d "Needs QA/testing"
gh label create "status: needs-review" -c "c5def5" -d "Needs code review"
gh label create "status: wontfix" -c "ffffff" -d "Will not be fixed"
gh label create "status: duplicate" -c "cfd3d7" -d "Duplicate issue"

# Effort labels
gh label create "effort: xs" -c "c2e0c6" -d "< 1 day"
gh label create "effort: s" -c "bfdadc" -d "1-2 days"
gh label create "effort: m" -c "fef2c0" -d "3-5 days"
gh label create "effort: l" -c "f9d0c4" -d "1-2 weeks"
gh label create "effort: xl" -c "e99695" -d "2+ weeks"

# Special labels
gh label create "good-first-issue" -c "7057ff" -d "Good for newcomers"
gh label create "help-wanted" -c "008672" -d "Extra attention needed"
gh label create "breaking-change" -c "d93f0b" -d "Breaks backward compatibility"
gh label create "security" -c "b60205" -d "Security-related"
gh label create "performance" -c "fbca04" -d "Performance improvement"
gh label create "accessibility" -c "0e8a16" -d "Accessibility improvement"
gh label create "epic" -c "3e4b9e" -d "Large multi-issue feature"
```

### Label Usage Guidelines

**Every issue should have:**
- 1 type label (required)
- 1+ component labels (what part of the system)
- 1 priority label (required)
- 1 effort label (required for features)
- 0+ domain labels (business domain)
- 0+ status labels (workflow state)

**Example issue labels:**
```
type: feature
component: seller-site
component: pricing-engine
domain: submissions
priority: high
effort: m
```

---

## 3. Milestones Structure

### Creating Milestones

Navigate to: **Issues** → **Milestones** → **New milestone**

### Phase-Based Milestones

Create these milestones in order:

#### Milestone 1: Foundation (v0.1)
**Due Date:** 2 weeks from project start
**Description:**
```
Project setup, architecture, and core infrastructure

Goals:
- Development environment setup
- Database schema design and migrations
- API architecture and routing structure
- Authentication/authorization framework
- CI/CD pipeline configuration
- External API integrations (Discogs/eBay) boilerplate

Deliverables:
- Working development environment
- Database migrations
- API health check endpoints
- Basic authentication
- Automated test suite structure
```

#### Milestone 2: Catalog & Pricing Engine (v0.2)
**Due Date:** 4 weeks from project start
**Description:**
```
Core catalog system and intelligent pricing engine

Goals:
- Release catalog CRUD operations
- Market data fetching (Discogs/eBay APIs)
- Pricing policy configuration system
- Condition curve calculations
- Buy/sell price calculation engine
- Admin pricing policy UI

Deliverables:
- Catalog management APIs
- Pricing engine with condition adjustments
- Admin console pricing configuration
- Market data sync automation
- Price calculation unit tests
```

#### Milestone 3: Seller Site (v0.3)
**Due Date:** 6 weeks from project start
**Description:**
```
"Sell to Us" site for seller submissions

Goals:
- Catalog search with autocomplete
- Real-time quote generation
- Media/sleeve condition selection
- Selling list (cart) management
- Seller submission workflow
- Email confirmations

Deliverables:
- Seller site UI (search, quote, submit)
- Instant pricing API
- Submission creation and validation
- Email notification system
- Seller-facing documentation
```

#### Milestone 4: Admin Console - Submissions (v0.4)
**Due Date:** 8 weeks from project start
**Description:**
```
Admin submission queue and review workflow

Goals:
- Submission queue dashboard
- Accept/counter/reject workflow
- Condition verification and adjustment
- Cost basis tracking
- Inventory lot creation from submissions
- Admin notification system

Deliverables:
- Submission queue UI
- Review workflow with status tracking
- Manual price override capability
- Inventory conversion flow
- Admin audit trail
```

#### Milestone 5: Inventory Management (v0.5)
**Due Date:** 10 weeks from project start
**Description:**
```
Admin inventory and catalog management

Goals:
- Inventory lot CRUD operations
- Bulk import/export tools
- Stock level tracking
- List price management with margin validation
- Markdown scheduling
- Merchandising data (photos, descriptions)

Deliverables:
- Inventory management UI
- Bulk operations (import CSV, export)
- Stock tracking and alerts
- Automated markdown system
- Photo upload and management
```

#### Milestone 6: Buyer Storefront (v0.6)
**Due Date:** 12 weeks from project start
**Description:**
```
"Buy from Us" ecommerce storefront

Goals:
- Product catalog browsing
- Advanced filtering (genre, condition, price)
- Product detail pages with condition info
- Shopping cart functionality
- Wishlist feature
- Recent price drop indicators

Deliverables:
- Buyer storefront UI
- Product catalog with filters
- Cart and wishlist features
- PDP with condition details
- Price history tracking
```

#### Milestone 7: Checkout & Fulfillment (v0.7)
**Due Date:** 14 weeks from project start
**Description:**
```
Complete checkout flow and order management

Goals:
- Checkout process with payment integration
- Order confirmation and tracking
- Inventory reservation and deduction
- Shipping label generation
- Order status notifications (email/SMS)
- Admin fulfillment dashboard

Deliverables:
- Payment provider integration
- Checkout UI and validation
- Order management system
- Shipping provider integration
- Customer notification system
- Admin order dashboard
```

#### Milestone 8: Polish & Launch Prep (v1.0)
**Due Date:** 16 weeks from project start
**Description:**
```
Production readiness, polish, and launch preparation

Goals:
- Performance optimization
- Security audit and hardening
- Accessibility improvements (WCAG 2.1 AA)
- Error handling and monitoring
- Admin analytics dashboard
- Load testing and scaling
- Production deployment

Deliverables:
- Performance benchmarks met
- Security audit passed
- Monitoring and alerting configured
- Analytics dashboard
- Production deployment documentation
- Launch runbook
```

#### Milestone 9: Post-Launch Enhancements (v1.1+)
**Due Date:** Ongoing
**Description:**
```
Post-launch improvements and new features

Goals:
- Additional marketplace integrations (Reverb.com)
- Advanced reporting and analytics
- Seller reputation system
- Mobile app considerations
- Multi-currency support
- Performance monitoring and optimization
- User feedback incorporation

Deliverables:
- Based on user feedback and business priorities
```

### Milestone Management Commands

```bash
# Create milestone via GitHub CLI
gh api repos/Badbeats87/site-oul-2/milestones \
  -f title="Foundation (v0.1)" \
  -f description="Project setup, architecture, core infrastructure" \
  -f due_on="2025-12-13T00:00:00Z"

# List all milestones
gh api repos/Badbeats87/site-oul-2/milestones

# Assign issue to milestone
gh issue edit 123 --milestone "Foundation (v0.1)"

# View milestone progress
gh api repos/Badbeats87/site-oul-2/milestones/1
```

---

## 4. Branch Protection Rules

### Main Branch Protection

Navigate to: **Settings** → **Branches** → **Add rule**

#### Branch Name Pattern
```
main
```

#### Protection Settings

**Require Pull Request Reviews**
- [x] Require approvals: **1**
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require review from Code Owners
- [x] Require approval of the most recent reviewable push

**Require Status Checks**
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- Required checks:
  - `build`
  - `test`
  - `lint`
  - `security-scan`
  - `code-coverage` (optional but recommended)

**Require Conversation Resolution**
- [x] Require conversation resolution before merging

**Require Signed Commits**
- [x] Require signed commits (recommended for security)

**Require Linear History**
- [x] Require linear history (prevents merge commits)

**Require Deployments to Succeed**
- [x] Require deployments to succeed before merging (for staging environment)
- Environment: `staging`

**Lock Branch**
- [ ] Lock branch (leave unchecked for active development)

**Restrict Who Can Push**
- [x] Restrict pushes that create matching branches
- Add: Repository admins only

**Allow Force Pushes**
- [ ] Allow force pushes (keep disabled)

**Allow Deletions**
- [ ] Allow deletions (keep disabled)

### Development Branch Protection

Create a second rule for `develop` branch:

#### Branch Name Pattern
```
develop
```

#### Protection Settings (Lighter)
- [x] Require approvals: **1**
- [x] Require status checks to pass before merging
  - Required: `build`, `test`
- [x] Require conversation resolution before merging
- [ ] Require linear history (allow merge commits)

### Feature Branch Naming Rules

Create a third rule to enforce naming conventions:

#### Branch Name Pattern
```
feature/**
fix/**
hotfix/**
enhancement/**
refactor/**
```

No special protections needed, but this documents expected patterns.

### YAML Configuration (for reference)

If configuring via GitHub API or Terraform:

```yaml
# .github/branch-protection.yml
main:
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
    require_last_push_approval: true

  required_status_checks:
    strict: true
    contexts:
      - build
      - test
      - lint
      - security-scan

  enforce_admins: false
  required_linear_history: true
  allow_force_pushes: false
  allow_deletions: false
  required_conversation_resolution: true

  required_signatures: true

  restrictions:
    users: []
    teams: []
    apps: []

develop:
  required_pull_request_reviews:
    required_approving_review_count: 1

  required_status_checks:
    strict: true
    contexts:
      - build
      - test

  required_conversation_resolution: true
```

### Applying Branch Protection via API

```bash
# Apply main branch protection
gh api repos/Badbeats87/site-oul-2/branches/main/protection \
  --method PUT \
  --input .github/branch-protection-main.json

# Apply develop branch protection
gh api repos/Badbeats87/site-oul-2/branches/develop/protection \
  --method PUT \
  --input .github/branch-protection-develop.json
```

---

## 5. CI/CD and Status Checks

### Recommended GitHub Actions Workflows

Create these workflow files in `.github/workflows/`:

#### 1. Build and Test Pipeline

**File:** `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 7

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: build

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          DISCOGS_API_KEY: ${{ secrets.DISCOGS_TEST_KEY }}

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  lint:
    name: Lint
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier check
        run: npm run format:check

      - name: Run TypeScript check
        run: npm run type-check

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

#### 2. Code Quality Checks

**File:** `.github/workflows/code-quality.yml`

```yaml
name: Code Quality

on:
  pull_request:
    branches: [main, develop]

jobs:
  sonarcloud:
    name: SonarCloud Analysis
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Shallow clones disabled for analysis

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          args: >
            -Dsonar.projectKey=Badbeats87_site-oul-2
            -Dsonar.organization=badbeats87
            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info

  code-review:
    name: Automated Code Review
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run CodeRabbit
        uses: coderabbitai/coderabbit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### 3. Database Migrations Check

**File:** `.github/workflows/db-check.yml`

```yaml
name: Database Checks

on:
  pull_request:
    paths:
      - 'migrations/**'
      - 'prisma/schema.prisma'

jobs:
  migration-check:
    name: Migration Validation
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: vinyl_catalog_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migrate:test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vinyl_catalog_test

      - name: Validate schema
        run: npm run prisma:validate

      - name: Check for migration conflicts
        run: npm run migrate:check
```

#### 4. E2E Tests

**File:** `.github/workflows/e2e.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Run nightly at 2 AM

jobs:
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

#### 5. Deployment Pipeline

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.vinyl-catalog.com

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Run database migrations
        run: npm run migrate:deploy
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

      - name: Deploy to staging
        run: npm run deploy:staging
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          BASE_URL: https://staging.vinyl-catalog.com

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://vinyl-catalog.com

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Run database migrations
        run: npm run migrate:deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

      - name: Deploy to production
        run: npm run deploy:production
        env:
          DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          BASE_URL: https://vinyl-catalog.com

      - name: Create release tag
        run: |
          git tag -a v${{ github.run_number }} -m "Production release ${{ github.run_number }}"
          git push origin v${{ github.run_number }}

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Required Secrets Configuration

Navigate to: **Settings** → **Secrets and variables** → **Actions**

Add these repository secrets:

```
# Testing
TEST_DATABASE_URL=postgresql://...
DISCOGS_TEST_KEY=...
EBAY_TEST_KEY=...

# Code Quality
CODECOV_TOKEN=...
SONAR_TOKEN=...
SNYK_TOKEN=...

# Deployment
STAGING_DATABASE_URL=...
STAGING_DEPLOY_KEY=...
PRODUCTION_DATABASE_URL=...
PRODUCTION_DEPLOY_KEY=...

# Notifications
SLACK_WEBHOOK=...
```

### Status Check Requirements

These checks should be marked as required in branch protection:

1. **build** - Application builds successfully
2. **test** - All tests pass
3. **lint** - Code passes linting rules
4. **security-scan** - No high-severity vulnerabilities
5. **code-coverage** - Coverage meets threshold (80%+)
6. **sonarcloud** - Code quality gates pass
7. **e2e-tests** - E2E tests pass (for main branch only)

---

## 6. GitHub Discussions

### Enabling Discussions

1. Navigate to: **Settings** → **General**
2. Scroll to **Features**
3. Check **Discussions**
4. Click **Set up discussions**

### Discussion Categories

Create these categories:

#### 1. Announcements
- **Description:** Important project updates and releases
- **Format:** Announcement (only maintainers can post)
- **Emoji:** 📢

#### 2. General
- **Description:** General discussion about the project
- **Format:** Open discussion
- **Emoji:** 💬

#### 3. Ideas
- **Description:** Share ideas for new features
- **Format:** Open discussion
- **Emoji:** 💡

#### 4. Q&A
- **Description:** Questions about usage, setup, or development
- **Format:** Question/Answer
- **Emoji:** ❓

#### 5. Show and Tell
- **Description:** Show off your vinyl catalog implementations
- **Format:** Open discussion
- **Emoji:** 🎉

#### 6. Technical Architecture
- **Description:** Deep dives into technical decisions and architecture
- **Format:** Open discussion
- **Emoji:** 🏗️

#### 7. Pricing & Business Logic
- **Description:** Discuss pricing strategies and business rules
- **Format:** Open discussion
- **Emoji:** 💰

#### 8. API Integrations
- **Description:** External API discussions (Discogs, eBay, etc.)
- **Format:** Q&A
- **Emoji:** 🔌

#### 9. Polls
- **Description:** Team polls and voting
- **Format:** Poll
- **Emoji:** 📊

### Pinned Discussions

Create and pin these initial discussions:

**1. Welcome to Vinyl Catalog System**
```markdown
Category: Announcements

Welcome to the Vinyl Catalog System project!

This platform powers a complete buy/sell marketplace for vinyl records with:
- Seller Site for instant quotes
- Buyer Storefront for purchasing
- Admin Console for management
- Intelligent Pricing Engine

Getting Started:
- Read the [README](../blob/main/README.md)
- Check out [product.md](../blob/main/product.md) for detailed specs
- Review [AGILE.md](../blob/main/AGILE.md) for workflow
- View UI mockups in mockups.html

Join the discussion and help build an amazing vinyl marketplace!
```

**2. Development Roadmap - What's Next?**
```markdown
Category: Announcements

Current Status: Kickoff Phase ✅

Completed:
- UI/UX mockups
- Product specification
- API integration specs (Discogs, eBay)
- Project structure

Next Up:
- Foundation (v0.1): Development environment and infrastructure
- Catalog & Pricing Engine (v0.2): Core pricing logic
- Seller Site (v0.3): "Sell to Us" interface

See all milestones: [Link to milestones]

Questions or ideas? Comment below!
```

**3. How to Contribute**
```markdown
Category: General

We welcome contributions! Here's how to get started:

1. Check out [CONTRIBUTING.md](../.github/CONTRIBUTING.md)
2. Look for issues labeled `good-first-issue`
3. Review our branch naming conventions
4. Submit PRs following our template
5. Join discussions to share ideas

Need help? Ask in Q&A category!
```

### Discussion Templates

Create templates in `.github/DISCUSSION_TEMPLATE/`:

**ideas.yml**
```yaml
title: "[IDEA] "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for sharing your idea! Please provide details below.

  - type: textarea
    id: description
    attributes:
      label: Idea Description
      description: What's your idea?
      placeholder: Describe your feature idea...
    validations:
      required: true

  - type: dropdown
    id: component
    attributes:
      label: Component
      description: Which part of the system?
      options:
        - Seller Site
        - Buyer Storefront
        - Admin Console
        - Pricing Engine
        - API/Backend
        - Infrastructure
    validations:
      required: true

  - type: textarea
    id: benefit
    attributes:
      label: Why is this valuable?
      description: What problem does it solve?
    validations:
      required: true
```

---

## 7. Wiki Structure

### Enabling Wiki

1. Navigate to: **Settings** → **General**
2. Scroll to **Features**
3. Check **Wikis**

### Wiki Page Structure

Create these wiki pages:

#### Home
```markdown
# Vinyl Catalog System Wiki

Welcome to the comprehensive documentation for the Vinyl Catalog System.

## Quick Links
- [[Getting Started]]
- [[Architecture Overview]]
- [[API Documentation]]
- [[Deployment Guide]]
- [[Troubleshooting]]

## For Developers
- [[Development Setup]]
- [[Coding Standards]]
- [[Testing Guide]]
- [[Database Schema]]
- [[CI/CD Pipeline]]

## For Admins
- [[Admin Console Guide]]
- [[Pricing Configuration]]
- [[Inventory Management]]
- [[Submission Review Process]]

## Business Logic
- [[Pricing Strategy]]
- [[Condition Grading]]
- [[Market Data Sources]]

## API Integrations
- [[Discogs API]]
- [[eBay API]]
- [[Payment Provider]]
- [[Shipping Provider]]
```

#### Architecture Overview
```markdown
# Architecture Overview

## System Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Seller Site │────▶│   API       │◀────│  Storefront │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Catalog DB  │
                    └─────────────┘
                           ▲
                           │
                    ┌─────────────┐
                    │   Pricing   │
                    │   Engine    │
                    └─────────────┘
                           ▲
                           │
                 ┌─────────┴─────────┐
                 │                   │
          ┌──────▼──────┐    ┌──────▼──────┐
          │   Discogs   │    │    eBay     │
          │     API     │    │     API     │
          └─────────────┘    └─────────────┘
```

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Queue**: Bull (Redis-based)
- **APIs**: Discogs, eBay
- **Hosting**: [TBD]

## Key Components
[[Read more details for each component]]
```

#### Getting Started
```markdown
# Getting Started

## Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)
- Git
- API Keys: Discogs, eBay

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/Badbeats87/site-oul-2.git
cd site-oul-2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Database Setup
```bash
npm run db:setup
npm run migrate
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## Next Steps
- [[Development Workflow]]
- [[Making Your First Contribution]]
- [[Running Tests]]
```

#### API Documentation
```markdown
# API Documentation

## Base URL
- Development: `http://localhost:3000/api`
- Staging: `https://staging-api.vinyl-catalog.com`
- Production: `https://api.vinyl-catalog.com`

## Authentication
All API requests require authentication via JWT token:

```bash
Authorization: Bearer <token>
```

## Endpoints

### Catalog
- `GET /catalog/releases` - List releases
- `GET /catalog/releases/:id` - Get release details
- `POST /catalog/search` - Search catalog
- `POST /catalog/quote` - Get instant quote

### Submissions
- `POST /submissions` - Create submission
- `GET /submissions/:id` - Get submission details
- `PATCH /submissions/:id` - Update submission
- `POST /submissions/:id/accept` - Accept submission (admin)

### Inventory
- `GET /inventory` - List inventory lots
- `POST /inventory` - Create inventory lot
- `PATCH /inventory/:id` - Update lot
- `DELETE /inventory/:id` - Remove lot

### Pricing
- `GET /pricing/policies` - List pricing policies
- `POST /pricing/calculate` - Calculate buy/sell prices

[[Full API reference]]
```

#### Database Schema
```markdown
# Database Schema

## Core Tables

### releases
Primary catalog of vinyl releases
```sql
CREATE TABLE releases (
  id UUID PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(500) NOT NULL,
  label VARCHAR(255),
  catalog_number VARCHAR(100),
  barcode VARCHAR(50),
  release_year INTEGER,
  genre VARCHAR(100),
  cover_art_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### market_snapshots
Price statistics from external sources
```sql
CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY,
  release_id UUID REFERENCES releases(id),
  source VARCHAR(50), -- 'discogs' | 'ebay'
  stat_low DECIMAL(10,2),
  stat_median DECIMAL(10,2),
  stat_high DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  fetched_at TIMESTAMP DEFAULT NOW()
);
```

[[View full schema]]
```

#### Pricing Strategy
```markdown
# Pricing Strategy

## Overview
The pricing engine calculates buy and sell prices using:
1. External market data (Discogs, eBay)
2. Condition curves (media + sleeve)
3. Configurable pricing policies
4. Margin requirements

## Buy Price Formula
```
offer = market_stat × buy_% × media_adjustment × sleeve_adjustment
```

## Sell Price Formula
```
list_price = market_stat × sell_% × media_adjustment × sleeve_adjustment
```

[[Read full pricing documentation]]
```

#### Deployment Guide
```markdown
# Deployment Guide

## Environments

### Staging
- **URL**: https://staging.vinyl-catalog.com
- **Database**: staging-db.vinyl-catalog.com
- **Deploy**: Automatic on merge to `develop`

### Production
- **URL**: https://vinyl-catalog.com
- **Database**: prod-db.vinyl-catalog.com
- **Deploy**: Manual approval after staging validation

## Deployment Process

### 1. Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Monitoring alerts configured

### 2. Deploy to Staging
```bash
npm run deploy:staging
```

### 3. Smoke Tests
```bash
npm run test:smoke -- --env=staging
```

### 4. Deploy to Production
```bash
npm run deploy:production
```

[[Full deployment procedures]]
```

#### Troubleshooting
```markdown
# Troubleshooting

## Common Issues

### Build Failures
**Symptom**: `npm run build` fails
**Solution**:
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check Node.js version: `node -v` (should be 18+)
3. Clear build cache: `rm -rf dist`

### Database Connection Errors
**Symptom**: "Cannot connect to database"
**Solution**:
1. Verify DATABASE_URL in .env
2. Check PostgreSQL is running: `pg_isready`
3. Verify credentials and port

### API Integration Failures
**Symptom**: "Discogs/eBay API error"
**Solution**:
1. Verify API keys in .env
2. Check rate limits
3. Review API logs

[[More troubleshooting guides]]
```

### Wiki Sidebar

Configure sidebar navigation:

```markdown
**Documentation**
- [[Home]]
- [[Getting Started]]
- [[Architecture Overview]]

**Development**
- [[Development Setup]]
- [[API Documentation]]
- [[Database Schema]]
- [[Testing Guide]]
- [[Coding Standards]]

**Deployment**
- [[Deployment Guide]]
- [[CI/CD Pipeline]]
- [[Monitoring]]

**Business Logic**
- [[Pricing Strategy]]
- [[Condition Grading]]
- [[Submission Workflow]]

**Admin Guides**
- [[Admin Console Guide]]
- [[Pricing Configuration]]
- [[Inventory Management]]

**Troubleshooting**
- [[Troubleshooting]]
- [[FAQ]]
```

---

## 8. Status Badges

### Badge Configuration

Add these badges to your README.md:

```markdown
# Vinyl Catalog System

![Build Status](https://github.com/Badbeats87/site-oul-2/actions/workflows/ci.yml/badge.svg)
![Tests](https://github.com/Badbeats87/site-oul-2/actions/workflows/ci.yml/badge.svg?event=push)
![Code Coverage](https://codecov.io/gh/Badbeats87/site-oul-2/branch/main/graph/badge.svg)
![License](https://img.shields.io/github/license/Badbeats87/site-oul-2)
![Version](https://img.shields.io/github/package-json/v/Badbeats87/site-oul-2)
![Issues](https://img.shields.io/github/issues/Badbeats87/site-oul-2)
![Pull Requests](https://img.shields.io/github/issues-pr/Badbeats87/site-oul-2)
![Contributors](https://img.shields.io/github/contributors/Badbeats87/site-oul-2)
![Last Commit](https://img.shields.io/github/last-commit/Badbeats87/site-oul-2)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Badbeats87_site-oul-2)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Badbeats87_site-oul-2)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Badbeats87_site-oul-2)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=Badbeats87_site-oul-2)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=bugs)](https://sonarcloud.io/summary/new_code?id=Badbeats87_site-oul-2)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=Badbeats87_site-oul-2)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=Badbeats87_site-oul-2)

![Uptime Robot status](https://img.shields.io/uptimerobot/status/m123456789-abcdefg)
![Uptime Robot ratio (7 days)](https://img.shields.io/uptimerobot/ratio/7/m123456789-abcdefg)

![Discord](https://img.shields.io/discord/YOUR_DISCORD_SERVER_ID?label=Discord&logo=discord)
![GitHub Sponsors](https://img.shields.io/github/sponsors/Badbeats87)
```

### Badge Categories

#### Build & Test Status
```markdown
![Build](https://github.com/Badbeats87/site-oul-2/actions/workflows/ci.yml/badge.svg)
![Tests](https://github.com/Badbeats87/site-oul-2/actions/workflows/ci.yml/badge.svg?event=push)
![E2E Tests](https://github.com/Badbeats87/site-oul-2/actions/workflows/e2e.yml/badge.svg)
```

#### Code Quality
```markdown
![Code Coverage](https://codecov.io/gh/Badbeats87/site-oul-2/branch/main/graph/badge.svg)
![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=alert_status)
![Maintainability](https://api.codeclimate.com/v1/badges/YOUR_BADGE_ID/maintainability)
```

#### Security
```markdown
![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Badbeats87_site-oul-2&metric=security_rating)
![Vulnerabilities](https://snyk.io/test/github/Badbeats87/site-oul-2/badge.svg)
```

#### Project Stats
```markdown
![Version](https://img.shields.io/github/package-json/v/Badbeats87/site-oul-2)
![License](https://img.shields.io/github/license/Badbeats87/site-oul-2)
![Issues](https://img.shields.io/github/issues/Badbeats87/site-oul-2)
![PRs](https://img.shields.io/github/issues-pr/Badbeats87/site-oul-2)
![Contributors](https://img.shields.io/github/contributors/Badbeats87/site-oul-2)
```

#### Deployment Status
```markdown
![Staging](https://img.shields.io/badge/staging-deployed-success)
![Production](https://img.shields.io/badge/production-v1.0.0-blue)
```

#### Dependencies
```markdown
![Dependencies](https://img.shields.io/librariesio/github/Badbeats87/site-oul-2)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
```

---

## 9. Automation Workflows

### GitHub Actions for Project Automation

#### 1. Auto-Label PRs

**File:** `.github/workflows/auto-label.yml`

```yaml
name: Auto Label PRs

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  label:
    runs-on: ubuntu-latest

    steps:
      - name: Label based on paths
        uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml

      - name: Label based on size
        uses: codelytv/pr-size-labeler@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          xs_label: 'size: xs'
          xs_max_size: 10
          s_label: 'size: s'
          s_max_size: 100
          m_label: 'size: m'
          m_max_size: 500
          l_label: 'size: l'
          l_max_size: 1000
          xl_label: 'size: xl'
```

**Labeler Config:** `.github/labeler.yml`

```yaml
# Auto-label based on file paths

'component: seller-site':
  - 'apps/seller-site/**/*'
  - 'packages/seller-*/**/*'

'component: buyer-storefront':
  - 'apps/storefront/**/*'
  - 'packages/storefront-*/**/*'

'component: admin-console':
  - 'apps/admin/**/*'
  - 'packages/admin-*/**/*'

'component: pricing-engine':
  - 'packages/pricing/**/*'
  - 'apps/api/src/pricing/**/*'

'component: api':
  - 'apps/api/**/*'
  - 'packages/api-*/**/*'

'component: database':
  - 'prisma/**/*'
  - 'migrations/**/*'

'domain: pricing':
  - '**/*pricing*/**/*'
  - '**/*price*/**/*'

'domain: inventory':
  - '**/*inventory*/**/*'
  - '**/*stock*/**/*'

'domain: submissions':
  - '**/*submission*/**/*'
  - '**/*seller*/**/*'

'type: documentation':
  - '**/*.md'
  - 'docs/**/*'

'type: refactor':
  - any: ['**/*refactor*/**/*']
```

#### 2. Stale Issues Management

**File:** `.github/workflows/stale.yml`

```yaml
name: Stale Issues

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  stale:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/stale@v9
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          days-before-stale: 30
          days-before-close: 7
          stale-issue-label: 'status: stale'
          stale-pr-label: 'status: stale'

          stale-issue-message: |
            This issue has been automatically marked as stale because it has not had
            recent activity. It will be closed in 7 days if no further activity occurs.

            If this is still relevant, please comment to keep it open.

            Thank you for your contributions!

          stale-pr-message: |
            This pull request has been automatically marked as stale because it has not had
            recent activity. It will be closed in 7 days if no further activity occurs.

            Please rebase and address any review comments to keep this PR active.

          close-issue-message: |
            This issue has been closed due to inactivity.
            Feel free to reopen if you'd like to continue working on this.

          close-pr-message: |
            This pull request has been closed due to inactivity.
            Please reopen if you'd like to continue working on this.

          exempt-issue-labels: 'priority: critical,priority: high,epic,status: blocked'
          exempt-pr-labels: 'priority: critical,priority: high,status: blocked'
```

#### 3. Welcome New Contributors

**File:** `.github/workflows/greetings.yml`

```yaml
name: Greetings

on:
  issues:
    types: [opened]
  pull_request_target:
    types: [opened]

jobs:
  greeting:
    runs-on: ubuntu-latest

    steps:
      - name: Greet first-time contributors
        uses: actions/first-interaction@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}

          issue-message: |
            👋 Welcome to Vinyl Catalog System!

            Thank you for opening your first issue! We appreciate your contribution.

            A maintainer will review your issue and provide feedback soon.

            In the meantime:
            - Review our [Contributing Guidelines](.github/CONTRIBUTING.md)
            - Check out the [Documentation](../../wiki)
            - Join our [Discussions](../../discussions)

            Looking forward to working with you!

          pr-message: |
            🎉 Thank you for your first pull request!

            We're excited to review your contribution. Here's what happens next:

            1. Automated checks will run (build, test, lint)
            2. A maintainer will review your code
            3. You may receive feedback or requests for changes
            4. Once approved, your PR will be merged!

            **Tips:**
            - Keep your PR focused and small
            - Respond to review comments promptly
            - Make sure all CI checks pass
            - Update documentation if needed

            Thanks for contributing to Vinyl Catalog System!
```

#### 4. Auto-Assign Reviewers

**File:** `.github/workflows/auto-assign.yml`

```yaml
name: Auto Assign Reviewers

on:
  pull_request:
    types: [opened, ready_for_review]

jobs:
  assign:
    runs-on: ubuntu-latest

    steps:
      - name: Assign reviewers based on paths
        uses: kentaro-m/auto-assign-action@v1.2.5
        with:
          configuration-path: '.github/auto-assign.yml'
```

**Auto-Assign Config:** `.github/auto-assign.yml`

```yaml
# Auto-assign reviewers based on file paths

addReviewers: true
addAssignees: false

reviewers:
  - teamlead
  - senior-dev1
  - senior-dev2

numberOfReviewers: 2

# Path-based reviewer assignment
filePathPatterns:
  'apps/seller-site/**':
    - frontend-dev1
    - frontend-dev2

  'apps/storefront/**':
    - frontend-dev1
    - ecommerce-specialist

  'apps/admin/**':
    - admin-dev
    - backend-dev1

  'packages/pricing/**':
    - pricing-specialist
    - backend-dev1

  'apps/api/**':
    - backend-dev1
    - backend-dev2

  'prisma/**':
    - database-specialist
    - backend-dev1

  '**/*.md':
    - tech-writer
    - teamlead
```

#### 5. Issue/PR Linking

**File:** `.github/workflows/link-checker.yml`

```yaml
name: Link Issues to PRs

on:
  pull_request:
    types: [opened, edited]

jobs:
  link-check:
    runs-on: ubuntu-latest

    steps:
      - name: Check for linked issue
        uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.pull_request;
            const body = pr.body || '';

            // Check if PR body contains issue reference
            const issuePattern = /(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#\d+/i;
            const hasIssue = issuePattern.test(body);

            if (!hasIssue) {
              github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pr.number,
                body: '⚠️ **Warning:** This PR does not reference any issue.\n\n' +
                      'Please link this PR to an issue using keywords like:\n' +
                      '- `Closes #123`\n' +
                      '- `Fixes #123`\n' +
                      '- `Resolves #123`\n\n' +
                      'This helps track work and automatically close issues when PRs merge.'
              });
            }
```

#### 6. Milestone Progress Tracker

**File:** `.github/workflows/milestone-progress.yml`

```yaml
name: Milestone Progress

on:
  issues:
    types: [opened, closed, milestoned, demilestoned]
  pull_request:
    types: [opened, closed]

jobs:
  update-milestone:
    runs-on: ubuntu-latest

    steps:
      - name: Calculate milestone progress
        uses: actions/github-script@v7
        with:
          script: |
            const milestone = context.payload.issue?.milestone || context.payload.pull_request?.milestone;

            if (!milestone) return;

            const { data: issues } = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              milestone: milestone.number,
              state: 'all'
            });

            const total = issues.length;
            const closed = issues.filter(i => i.state === 'closed').length;
            const progress = total > 0 ? Math.round((closed / total) * 100) : 0;

            console.log(`Milestone "${milestone.title}" progress: ${progress}% (${closed}/${total})`);

            // Update milestone description with progress
            await github.rest.issues.updateMilestone({
              owner: context.repo.owner,
              repo: context.repo.repo,
              milestone_number: milestone.number,
              description: milestone.description + `\n\n---\n📊 Progress: ${progress}% (${closed}/${total} issues completed)`
            });
```

#### 7. Release Notes Generator

**File:** `.github/workflows/release-notes.yml`

```yaml
name: Generate Release Notes

on:
  push:
    tags:
      - 'v*'

jobs:
  release-notes:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate release notes
        uses: orhun/git-cliff-action@v3
        with:
          config: cliff.toml
          args: --latest --strip header
        env:
          OUTPUT: CHANGELOG.md

      - name: Create GitHub Release
        uses: ncipollo/release-action@v1
        with:
          bodyFile: CHANGELOG.md
          token: ${{ secrets.GITHUB_TOKEN }}
```

#### 8. Dependency Updates

**File:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  # Enable version updates for npm
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "teamlead"
      - "backend-dev1"
    assignees:
      - "teamlead"
    labels:
      - "type: dependencies"
      - "priority: low"
    commit-message:
      prefix: "chore(deps):"
      include: "scope"

  # Enable version updates for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "type: dependencies"
      - "component: infrastructure"
```

#### 9. Code Owners Automation

**File:** `.github/CODEOWNERS`

```
# Global owners
*                                   @teamlead

# Frontend
/apps/seller-site/**                @frontend-dev1 @frontend-dev2
/apps/storefront/**                 @frontend-dev1 @ecommerce-specialist
/apps/admin/**                      @admin-dev @frontend-dev1

# Backend
/apps/api/**                        @backend-dev1 @backend-dev2
/packages/pricing/**                @pricing-specialist @backend-dev1

# Database
/prisma/**                          @database-specialist @backend-dev1
/migrations/**                      @database-specialist

# Infrastructure
/.github/workflows/**               @devops-lead
/docker/**                          @devops-lead
/.github/GITHUB_SETUP_GUIDE.md      @teamlead @devops-lead

# Documentation
*.md                                @tech-writer @teamlead
/docs/**                            @tech-writer
```

#### 10. Project Board Automation

**File:** `.github/workflows/project-automation.yml`

```yaml
name: Project Board Automation

on:
  issues:
    types: [opened, reopened, closed, assigned]
  pull_request:
    types: [opened, reopened, closed, review_requested]

jobs:
  add-to-project:
    runs-on: ubuntu-latest

    steps:
      - name: Add to project board
        uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/orgs/Badbeats87/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          labeled: priority:high,priority:critical

      - name: Move based on status
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue || context.payload.pull_request;

            // Logic to move cards based on events
            if (context.payload.action === 'assigned') {
              // Move to "In Progress"
              console.log('Moving to In Progress');
            } else if (context.payload.action === 'closed') {
              // Move to "Done"
              console.log('Moving to Done');
            }
```

---

## Quick Start Checklist

Use this checklist to set up your GitHub repository:

### Week 1: Foundation
- [ ] Create GitHub Projects board with columns
- [ ] Set up custom fields (Priority, Effort, Component, Sprint)
- [ ] Create all issue labels using the batch script
- [ ] Create first 3 milestones (Foundation, Catalog, Seller Site)
- [ ] Enable GitHub Discussions with categories
- [ ] Create initial pinned discussions
- [ ] Enable Wiki and create Home page

### Week 2: Automation
- [ ] Set up branch protection rules for `main` and `develop`
- [ ] Create CI/CD workflow files (ci.yml, deploy.yml)
- [ ] Configure repository secrets for CI/CD
- [ ] Set up auto-labeling workflow
- [ ] Configure Dependabot for dependency updates
- [ ] Create CODEOWNERS file
- [ ] Set up stale issue management

### Week 3: Quality & Visibility
- [ ] Integrate CodeCov for code coverage
- [ ] Set up SonarCloud for code quality
- [ ] Configure Snyk for security scanning
- [ ] Add status badges to README
- [ ] Create wiki pages (Getting Started, Architecture)
- [ ] Set up project board automation
- [ ] Configure auto-assign reviewers

### Week 4: Polish
- [ ] Create issue templates for bugs and features
- [ ] Update PR template with detailed checklist
- [ ] Create welcome workflow for new contributors
- [ ] Set up release notes automation
- [ ] Configure milestone progress tracking
- [ ] Test all workflows end-to-end
- [ ] Document setup process for team

---

## Best Practices

### Issue Management
1. **Always use labels** - Every issue needs type, component, and priority
2. **Link to milestones** - Assign issues to appropriate milestones
3. **Regular triage** - Review and prioritize backlog weekly
4. **Clear descriptions** - Include context, acceptance criteria, and resources
5. **Update status** - Keep issue status current as work progresses

### Pull Requests
1. **Small PRs** - Keep changes focused and reviewable
2. **Link issues** - Always reference related issues
3. **Pass CI** - Ensure all checks pass before requesting review
4. **Respond quickly** - Address review feedback promptly
5. **Clean history** - Squash commits if needed before merge

### Project Board
1. **Single source of truth** - Use board for sprint planning
2. **Daily updates** - Move cards as work progresses
3. **WIP limits** - Limit "In Progress" to prevent context switching
4. **Sprint goals** - Define clear goals for each sprint
5. **Retrospectives** - Review board efficiency regularly

### Communication
1. **Use Discussions** - For questions and ideas, not issues
2. **Document decisions** - Record architectural decisions in wiki
3. **Status updates** - Post progress updates in Discussions
4. **Be responsive** - Reply to comments and reviews promptly
5. **Be respectful** - Follow code of conduct

---

## Resources

### GitHub Documentation
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Discussions](https://docs.github.com/en/discussions)
- [GitHub Wiki](https://docs.github.com/en/communities/documenting-your-project-with-wikis)

### Tools
- [GitHub CLI](https://cli.github.com/)
- [GitHub Desktop](https://desktop.github.com/)
- [GitHub Mobile](https://github.com/mobile)

### Integrations
- [CodeCov](https://codecov.io/)
- [SonarCloud](https://sonarcloud.io/)
- [Snyk](https://snyk.io/)
- [Dependabot](https://github.com/dependabot)

---

## Support

Need help setting up?

- **Documentation**: Check this guide and project documentation
- **Discussions**: Ask in [GitHub Discussions](https://github.com/Badbeats87/site-oul-2/discussions)
- **Issues**: Report problems with [GitHub Issues](https://github.com/Badbeats87/site-oul-2/issues)
- **Team**: Reach out to @teamlead or maintainers

---

**Last Updated**: 2025-11-29
**Version**: 1.0
**Maintainer**: Project Team Lead
