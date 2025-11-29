# GitHub Quick Reference - Vinyl Catalog System

Quick reference guide for common GitHub operations and workflows.

## Table of Contents
- [Common Commands](#common-commands)
- [Label Reference](#label-reference)
- [Workflow Cheatsheet](#workflow-cheatsheet)
- [PR Checklist](#pr-checklist)
- [Issue Templates](#issue-templates)

---

## Common Commands

### Setup Labels
```bash
# Run the label setup script (one time)
.github/workflows/label-setup.sh
```

### Working with Issues

```bash
# List all issues
gh issue list

# List issues by label
gh issue list --label "priority: high"
gh issue list --label "component: pricing-engine"

# Create an issue
gh issue create --title "Bug: Quote calculation fails" \
  --body "Description..." \
  --label "type: bug,component: pricing-engine,priority: high"

# View issue details
gh issue view 123

# Add labels to issue
gh issue edit 123 --add-label "status: ready"

# Assign issue
gh issue edit 123 --assignee @me

# Close issue
gh issue close 123
```

### Working with Pull Requests

```bash
# Create PR
gh pr create --title "feat(pricing): add condition curves" \
  --body "Closes #123"

# List PRs
gh pr list

# View PR details
gh pr view 456

# Check out PR locally
gh pr checkout 456

# Review PR
gh pr review 456 --approve
gh pr review 456 --request-changes --body "Please fix..."
gh pr review 456 --comment --body "Looks good but..."

# Merge PR
gh pr merge 456 --squash
gh pr merge 456 --rebase

# Check PR status
gh pr status
```

### Working with Projects

```bash
# View project
gh project view 1

# Add issue to project
gh project item-add 1 --owner Badbeats87 --issue 123

# List project items
gh project item-list 1
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "feat(seller-site): add quote form"

# Push branch
git push -u origin feature/my-feature

# Update branch with main
git fetch origin
git rebase origin/main

# Squash commits
git rebase -i HEAD~3
```

---

## Label Reference

### Required Labels

Every issue MUST have:

#### Type (pick one)
| Label | Description | Color |
|-------|-------------|-------|
| `type: feature` | New feature or capability | ![#0e8a16](https://via.placeholder.com/15/0e8a16/000000?text=+) `#0e8a16` |
| `type: enhancement` | Improvement to existing functionality | ![#a2eeef](https://via.placeholder.com/15/a2eeef/000000?text=+) `#a2eeef` |
| `type: bug` | Defect that needs fixing | ![#d73a4a](https://via.placeholder.com/15/d73a4a/000000?text=+) `#d73a4a` |
| `type: hotfix` | Critical bug requiring immediate fix | ![#b60205](https://via.placeholder.com/15/b60205/000000?text=+) `#b60205` |

#### Component (pick one or more)
| Label | Description |
|-------|-------------|
| `component: seller-site` | Seller "Sell to Us" site |
| `component: buyer-storefront` | Buyer "Buy from Us" storefront |
| `component: admin-console` | Internal admin console |
| `component: pricing-engine` | Pricing calculation and policies |
| `component: api` | Backend API and services |
| `component: database` | Database schema and migrations |
| `component: integrations` | External APIs (Discogs/eBay) |
| `component: infrastructure` | DevOps and deployment |

#### Priority (pick one)
| Label | When to Use |
|-------|-------------|
| `priority: critical` | Blocks release, production down |
| `priority: high` | Important for next sprint |
| `priority: medium` | Normal priority work |
| `priority: low` | Nice to have, future work |

### Optional Labels

#### Domain
- `domain: pricing` - Pricing strategy
- `domain: inventory` - Inventory management
- `domain: submissions` - Seller submissions
- `domain: catalog` - Catalog metadata
- `domain: checkout` - Checkout and payment
- `domain: shipping` - Shipping and fulfillment
- `domain: notifications` - Email/SMS notifications
- `domain: auth` - Authentication

#### Effort
- `effort: xs` - < 1 day
- `effort: s` - 1-2 days
- `effort: m` - 3-5 days
- `effort: l` - 1-2 weeks
- `effort: xl` - 2+ weeks

#### Status
- `status: blocked` - Blocked by dependencies
- `status: needs-info` - Needs more information
- `status: ready` - Ready to work on
- `status: needs-testing` - Needs QA/testing
- `status: needs-review` - Needs code review

#### Special
- `good-first-issue` - Good for newcomers
- `help-wanted` - Extra attention needed
- `breaking-change` - Breaks backward compatibility
- `security` - Security-related
- `performance` - Performance improvement
- `epic` - Large multi-issue feature

### Label Examples

```bash
# Feature for pricing engine (high priority, medium effort)
--label "type: feature,component: pricing-engine,domain: pricing,priority: high,effort: m"

# Bug in seller site (critical, quick fix)
--label "type: bug,component: seller-site,priority: critical,effort: xs,status: ready"

# Enhancement for admin console (medium priority)
--label "type: enhancement,component: admin-console,domain: inventory,priority: medium,effort: s"

# Good first issue
--label "type: feature,component: api,priority: low,effort: xs,good-first-issue"
```

---

## Workflow Cheatsheet

### Starting New Work

1. **Find or create issue**
   ```bash
   gh issue list --label "status: ready"
   # or
   gh issue create --title "..." --label "..."
   ```

2. **Assign to yourself**
   ```bash
   gh issue edit 123 --assignee @me
   ```

3. **Create branch**
   ```bash
   git checkout -b feature/brief-description
   ```

4. **Add to project board** (optional)
   ```bash
   gh project item-add 1 --owner Badbeats87 --issue 123
   ```

### During Development

1. **Make changes and commit often**
   ```bash
   git add .
   git commit -m "feat(component): description"
   ```

2. **Keep branch updated**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

3. **Run checks locally**
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run build
   ```

### Submitting Work

1. **Push branch**
   ```bash
   git push -u origin feature/brief-description
   ```

2. **Create PR**
   ```bash
   gh pr create \
     --title "feat(component): description" \
     --body "Closes #123

   ## Description
   Brief description...

   ## Changes
   - Change 1
   - Change 2

   ## Testing
   How to test...

   ## Checklist
   - [x] Tests pass
   - [x] Documentation updated
   "
   ```

3. **Wait for review**
   - CI checks must pass
   - Address review feedback
   - Request re-review

4. **Merge after approval**
   ```bash
   gh pr merge 456 --squash
   ```

---

## PR Checklist

Before creating a PR, ensure:

### Code Quality
- [ ] Code follows project style guidelines
- [ ] No linting errors: `npm run lint`
- [ ] Type checks pass: `npm run type-check`
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added (if applicable)
- [ ] E2E tests updated (if applicable)
- [ ] Manual testing completed
- [ ] Edge cases considered

### Documentation
- [ ] Code comments added for complex logic
- [ ] API documentation updated (if applicable)
- [ ] README updated (if applicable)
- [ ] Wiki updated (if applicable)
- [ ] CHANGELOG updated (if applicable)

### PR Requirements
- [ ] PR title follows convention: `type(scope): description`
- [ ] PR description filled out completely
- [ ] Linked to issue: `Closes #123`
- [ ] Branch is up to date with main
- [ ] No merge conflicts
- [ ] Appropriate labels added
- [ ] Reviewers assigned (if not auto-assigned)

### Special Considerations
- [ ] Breaking changes documented (if any)
- [ ] Database migrations tested (if applicable)
- [ ] Security implications considered
- [ ] Performance impact assessed
- [ ] Accessibility checked (for UI changes)

---

## Issue Templates

### Quick Issue Creation

#### Bug Report
```bash
gh issue create \
  --title "[BUG] Brief description" \
  --label "type: bug,priority: high" \
  --body "**Environment**: Production
**Component**: Pricing Engine

**Description**:
Quote calculation returns incorrect value

**Steps to Reproduce**:
1. Go to seller site
2. Search for album
3. Select Mint condition
4. Observe incorrect quote

**Expected**: Quote should be $66
**Actual**: Quote is $55

**Impact**: Sellers receiving incorrect quotes"
```

#### Feature Request
```bash
gh issue create \
  --title "[FEATURE] Brief description" \
  --label "type: feature,priority: medium" \
  --body "**Component**: Admin Console

**Problem**:
Admins need to bulk import catalog data

**Proposed Solution**:
Add CSV import feature with validation

**Acceptance Criteria**:
- [ ] CSV upload interface
- [ ] Data validation
- [ ] Error reporting
- [ ] Import preview
- [ ] Rollback capability"
```

#### Epic
```bash
gh issue create \
  --title "[EPIC] Large feature description" \
  --label "epic,priority: high" \
  --body "**Vision**:
Complete implementation of pricing engine

**Scope**:
- Market data fetching
- Condition curve calculations
- Pricing policy management
- Admin UI

**Issues**:
- [ ] #123 - Market data API
- [ ] #124 - Condition curves
- [ ] #125 - Policy editor UI

**Timeline**: 2 sprints
**Milestone**: v0.2"
```

---

## Milestone Reference

| Milestone | Version | Timeline | Focus |
|-----------|---------|----------|-------|
| Foundation | v0.1 | Week 1-2 | Setup, infrastructure, database |
| Catalog & Pricing | v0.2 | Week 3-4 | Core pricing engine, catalog |
| Seller Site | v0.3 | Week 5-6 | "Sell to Us" interface |
| Admin Console | v0.4 | Week 7-8 | Submission queue, reviews |
| Inventory | v0.5 | Week 9-10 | Inventory management |
| Buyer Storefront | v0.6 | Week 11-12 | "Buy from Us" interface |
| Checkout | v0.7 | Week 13-14 | Payment, orders, fulfillment |
| Launch | v1.0 | Week 15-16 | Polish, testing, deployment |

---

## Quick Tips

### Finding Issues to Work On

```bash
# Good first issues for newcomers
gh issue list --label "good-first-issue"

# High priority items
gh issue list --label "priority: high" --state open

# Ready to work on
gh issue list --label "status: ready"

# By component
gh issue list --label "component: pricing-engine"
```

### Reviewing PRs

```bash
# Check out PR locally
gh pr checkout 456
npm install
npm test
npm run dev

# Test the changes
# Then provide feedback

gh pr review 456 --approve --body "LGTM! Tested locally."
```

### Updating Stale Branch

```bash
# Fetch latest changes
git fetch origin

# Rebase on main
git rebase origin/main

# If conflicts, resolve and continue
git add .
git rebase --continue

# Force push (only if needed)
git push --force-with-lease
```

### Emergency Hotfix

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Make fix and test
# ... make changes ...
npm test

# Commit and push
git add .
git commit -m "hotfix: fix critical bug"
git push -u origin hotfix/critical-bug

# Create PR with high priority
gh pr create \
  --title "hotfix: fix critical bug" \
  --label "type: hotfix,priority: critical" \
  --body "Closes #789

Critical fix for production issue."
```

---

## Resources

- **Full Guide**: [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Workflow**: [AGILE.md](../AGILE.md)
- **Product Docs**: [product.md](../product.md)
- **Repository**: https://github.com/Badbeats87/site-oul-2

---

## Need Help?

- **Questions**: [GitHub Discussions](https://github.com/Badbeats87/site-oul-2/discussions)
- **Issues**: [Report a bug](https://github.com/Badbeats87/site-oul-2/issues/new)
- **Documentation**: [Project Wiki](https://github.com/Badbeats87/site-oul-2/wiki)

---

**Last Updated**: 2025-11-29
