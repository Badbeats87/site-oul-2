# GitHub Setup Files Overview

This directory contains all GitHub configuration and automation files for the Vinyl Catalog System project.

## Documentation Files

### 📚 Main Guides

| File | Purpose | Audience |
|------|---------|----------|
| **[GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md)** | Complete GitHub setup with step-by-step instructions | Team Lead, DevOps |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Comprehensive contribution guidelines | All Contributors |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Quick reference for common operations | All Developers |

### 📋 Templates

| File | Purpose | Usage |
|------|---------|-------|
| **[pull_request_template.md](pull_request_template.md)** | PR template with checklist | Auto-loaded when creating PRs |
| **[ISSUE_TEMPLATE/bug_report.yml](ISSUE_TEMPLATE/bug_report.yml)** | Structured bug report form | Select when creating bug issues |
| **[ISSUE_TEMPLATE/feature_request.yml](ISSUE_TEMPLATE/feature_request.yml)** | Structured feature request form | Select when creating feature issues |
| **[ISSUE_TEMPLATE/epic.yml](ISSUE_TEMPLATE/epic.yml)** | Epic planning template | Select when creating epics |
| **[ISSUE_TEMPLATE/config.yml](ISSUE_TEMPLATE/config.yml)** | Issue template configuration | Auto-loaded by GitHub |

## Configuration Files

### 🔧 GitHub Configuration

| File | Purpose | Documentation |
|------|---------|---------------|
| **[CODEOWNERS](CODEOWNERS)** | Define code ownership and auto-assign reviewers | [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) |
| **[dependabot.yml](dependabot.yml)** | Automated dependency updates | [Dependabot Docs](https://docs.github.com/en/code-security/dependabot) |
| **[labeler.yml](labeler.yml)** | Auto-label PRs based on file paths | [Labeler Action](https://github.com/actions/labeler) |
| **[auto-assign.yml](auto-assign.yml)** | Auto-assign reviewers to PRs | [Auto-assign Action](https://github.com/kentaro-m/auto-assign-action) |

## Automation Scripts

### 🤖 Workflow Scripts

| File | Purpose | Usage |
|------|---------|-------|
| **[workflows/label-setup.sh](workflows/label-setup.sh)** | Batch create all project labels | Run once: `./workflows/label-setup.sh` |

### 📦 GitHub Actions (Future)

Create these workflow files in `.github/workflows/`:

| Workflow | File | Purpose |
|----------|------|---------|
| CI Pipeline | `ci.yml` | Build, test, lint |
| Code Quality | `code-quality.yml` | SonarCloud, CodeCov |
| Database Checks | `db-check.yml` | Migration validation |
| E2E Tests | `e2e.yml` | End-to-end testing |
| Deployment | `deploy.yml` | Deploy to staging/production |
| Auto Label | `auto-label.yml` | Auto-label PRs |
| Stale Issues | `stale.yml` | Manage stale issues/PRs |
| Greetings | `greetings.yml` | Welcome new contributors |
| Auto Assign | `auto-assign.yml` | Assign reviewers |
| Link Checker | `link-checker.yml` | Ensure PRs link to issues |
| Milestone Progress | `milestone-progress.yml` | Track milestone completion |
| Release Notes | `release-notes.yml` | Generate release notes |
| Project Automation | `project-automation.yml` | Project board automation |

## Setup Checklist

Use this checklist to set up your GitHub repository:

### Week 1: Foundation ✅

- [ ] **Labels**
  ```bash
  cd .github/workflows
  ./label-setup.sh
  ```
  - Creates all type, component, domain, priority, effort, status, and special labels
  - Run once to set up the entire label system

- [ ] **GitHub Projects**
  - Navigate to repository → Projects → New project
  - Choose "Board" layout
  - Name: "Vinyl Catalog Development"
  - Create columns: Backlog, Ready, In Progress, Code Review, Testing, Done
  - Add custom fields: Priority, Effort, Component, Sprint, Target Date
  - Configure automation for each column

- [ ] **Milestones**
  - Navigate to Issues → Milestones → New milestone
  - Create milestones from the guide:
    - Foundation (v0.1)
    - Catalog & Pricing Engine (v0.2)
    - Seller Site (v0.3)
    - Admin Console - Submissions (v0.4)
    - Inventory Management (v0.5)
    - Buyer Storefront (v0.6)
    - Checkout & Fulfillment (v0.7)
    - Polish & Launch Prep (v1.0)
    - Post-Launch Enhancements (v1.1+)

- [ ] **GitHub Discussions**
  - Navigate to Settings → General → Features
  - Enable "Discussions"
  - Create categories: Announcements, General, Ideas, Q&A, Show and Tell, Technical Architecture, Pricing & Business Logic, API Integrations, Polls
  - Create pinned welcome discussion

- [ ] **GitHub Wiki**
  - Navigate to Settings → General → Features
  - Enable "Wikis"
  - Create Home page with navigation
  - Create initial pages: Getting Started, Architecture Overview, API Documentation

### Week 2: Automation ⚙️

- [ ] **Branch Protection Rules**
  - Navigate to Settings → Branches → Add rule
  - Set up protection for `main` branch:
    - Require pull request reviews (1 approval)
    - Require status checks to pass
    - Require conversation resolution
    - Require signed commits
    - Require linear history
  - Set up lighter protection for `develop` branch

- [ ] **Repository Secrets**
  - Navigate to Settings → Secrets and variables → Actions
  - Add secrets for CI/CD:
    - `TEST_DATABASE_URL`
    - `DISCOGS_TEST_KEY`
    - `EBAY_TEST_KEY`
    - `CODECOV_TOKEN`
    - `SONAR_TOKEN`
    - `SNYK_TOKEN`
    - `STAGING_DATABASE_URL`
    - `STAGING_DEPLOY_KEY`
    - `PRODUCTION_DATABASE_URL`
    - `PRODUCTION_DEPLOY_KEY`
    - `SLACK_WEBHOOK`

- [ ] **GitHub Actions Workflows**
  - Create workflow files in `.github/workflows/`
  - Start with essential workflows:
    - `ci.yml` - Build and test
    - `auto-label.yml` - Auto-label PRs
    - `stale.yml` - Manage stale issues
    - `greetings.yml` - Welcome contributors
  - Configure status checks in branch protection

### Week 3: Quality & Visibility 📊

- [ ] **Code Quality Tools**
  - Set up CodeCov: https://codecov.io/
  - Set up SonarCloud: https://sonarcloud.io/
  - Set up Snyk: https://snyk.io/
  - Add badges to README.md

- [ ] **Status Badges**
  - Update README.md with badges for:
    - Build status
    - Test coverage
    - Code quality
    - Security
    - Version
    - License
    - Issues/PRs

- [ ] **Project Board Automation**
  - Create `project-automation.yml` workflow
  - Configure automation rules:
    - New issues → Backlog
    - Assigned issues → In Progress
    - PRs opened → Code Review
    - PRs with "needs-testing" → Testing
    - Closed issues/merged PRs → Done

### Week 4: Polish 💎

- [ ] **Documentation**
  - Verify all issue templates work
  - Test PR template
  - Update wiki with architecture diagrams
  - Create Getting Started guide
  - Document API endpoints

- [ ] **Team Setup**
  - Update CODEOWNERS with real team members
  - Configure auto-assign rules
  - Set up notification preferences
  - Schedule first sprint planning meeting

- [ ] **Testing**
  - Test creating issues with templates
  - Test creating PRs with template
  - Verify labels auto-apply
  - Test project board automation
  - Verify branch protection rules work

## File Relationships

```
.github/
├── GITHUB_SETUP_GUIDE.md          # Master setup guide (start here)
├── CONTRIBUTING.md                # Read before contributing
├── QUICK_REFERENCE.md             # Quick command reference
│
├── pull_request_template.md       # Used by: All PRs
│
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml            # Used by: Bug issues
│   ├── feature_request.yml       # Used by: Feature issues
│   ├── epic.yml                  # Used by: Epic issues
│   └── config.yml                # Configures: Issue templates
│
├── CODEOWNERS                     # Used by: PR auto-assignment
├── dependabot.yml                 # Used by: Dependabot
├── labeler.yml                    # Used by: auto-label.yml workflow
├── auto-assign.yml                # Used by: auto-assign.yml workflow
│
└── workflows/
    ├── label-setup.sh             # Run manually to create labels
    ├── ci.yml                     # (future) CI pipeline
    ├── auto-label.yml             # (future) Auto-label PRs
    ├── stale.yml                  # (future) Manage stale items
    └── ...                        # (future) Other workflows
```

## Quick Start

### For Team Lead / Repository Admin

1. **Run label setup script**
   ```bash
   cd .github/workflows
   ./label-setup.sh
   ```

2. **Set up GitHub Projects**
   - Follow instructions in [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md#1-github-projects-setup)

3. **Create milestones**
   - Follow instructions in [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md#3-milestones-structure)

4. **Configure branch protection**
   - Follow instructions in [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md#4-branch-protection-rules)

5. **Enable Discussions and Wiki**
   - Follow instructions in [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md#6-github-discussions)

### For Contributors

1. **Read contributing guidelines**
   - Start with [CONTRIBUTING.md](CONTRIBUTING.md)

2. **Learn the workflow**
   - Review [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

3. **Find something to work on**
   - Browse issues labeled `good-first-issue`
   - Check the project board

4. **Follow the process**
   - Create branch
   - Make changes
   - Create PR using template
   - Address feedback
   - Merge after approval

## Common Tasks

### Creating a New Issue

1. Go to Issues → New issue
2. Choose template (Bug Report, Feature Request, or Epic)
3. Fill out the form
4. Add labels (type, component, priority required)
5. Assign to milestone if applicable
6. Submit

### Creating a Pull Request

1. Push your branch
2. GitHub will prompt you to create PR
3. Use the PR template
4. Link to issue: `Closes #123`
5. Add labels (auto-labeled based on files changed)
6. Request reviewers (auto-assigned based on CODEOWNERS)
7. Wait for CI checks and review

### Managing Project Board

1. New issues automatically go to Backlog
2. Drag to Ready when prioritized
3. Assign to yourself to move to In Progress
4. Create PR to move to Code Review
5. Merge PR to move to Done

## Customization

### Updating Labels

Edit `.github/workflows/label-setup.sh` and re-run:
```bash
./label-setup.sh
```

### Updating CODEOWNERS

Edit `.github/CODEOWNERS` with your team members:
```
# Example
/apps/api/**    @your-backend-dev
```

### Updating Auto-Assign

Edit `.github/auto-assign.yml` to change reviewer assignment rules:
```yaml
reviewers:
  - your-team-lead
  - your-senior-dev
```

### Updating Issue Templates

Edit files in `.github/ISSUE_TEMPLATE/` to customize forms.

## Troubleshooting

### Labels not appearing
- Run `./workflows/label-setup.sh` again
- Check GitHub CLI is authenticated: `gh auth status`

### PRs not auto-labeled
- Verify `.github/labeler.yml` exists
- Check `.github/workflows/auto-label.yml` workflow is enabled

### Reviewers not auto-assigned
- Verify `.github/CODEOWNERS` exists
- Check branch protection requires code owner reviews
- Verify `.github/auto-assign.yml` workflow is enabled

### Branch protection not working
- Check you're an admin or have proper permissions
- Verify rules are configured for correct branch name
- Check status checks are defined in workflows

## Additional Resources

### GitHub Documentation
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)

### Tools
- [GitHub CLI](https://cli.github.com/) - Command-line interface for GitHub
- [GitHub Desktop](https://desktop.github.com/) - GUI for Git
- [GitHub Mobile](https://github.com/mobile) - Mobile app

### Project-Specific
- [README.md](../README.md) - Project overview
- [product.md](../product.md) - Product specification
- [AGILE.md](../AGILE.md) - Agile workflow
- [Project Board](https://github.com/Badbeats87/site-oul-2/projects) - Track work
- [Discussions](https://github.com/Badbeats87/site-oul-2/discussions) - Community

## Questions?

- **Setup Issues**: Check [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md)
- **Contributing Questions**: Check [CONTRIBUTING.md](CONTRIBUTING.md)
- **Quick Commands**: Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Need Help**: Open a [Discussion](https://github.com/Badbeats87/site-oul-2/discussions)

---

**Version**: 1.0
**Last Updated**: 2025-11-29
**Maintained By**: Project Team Lead
