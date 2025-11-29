# Contributing to Vinyl Catalog System

Thank you for your interest in contributing! This document provides guidelines for the development process.

## Quick Links

- [AGILE.md](../AGILE.md) - Detailed workflow and sprint planning
- [GitHub Setup Guide](.github/GITHUB_SETUP_GUIDE.md) - Complete GitHub configuration
- [Project Board](https://github.com/Badbeats87/site-oul-2/projects) - Track work items
- [Discussions](https://github.com/Badbeats87/site-oul-2/discussions) - Ask questions
- [Wiki](https://github.com/Badbeats87/site-oul-2/wiki) - Documentation

## Getting Started

### 1. Set Up Development Environment

```bash
# Clone the repository
git clone https://github.com/Badbeats87/site-oul-2.git
cd site-oul-2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:setup
npm run migrate

# Start development server
npm run dev
```

### 2. Find Something to Work On

- Browse [open issues](https://github.com/Badbeats87/site-oul-2/issues)
- Look for `good-first-issue` label for newcomers
- Check the [project board](https://github.com/Badbeats87/site-oul-2/projects) for planned work
- Ask in [Discussions](https://github.com/Badbeats87/site-oul-2/discussions) if unsure

### 3. Create an Issue (if needed)

Before starting work, ensure there's an issue:
- Check existing issues to avoid duplicates
- Use issue templates (Feature Request, Bug Report, or Epic)
- Include clear description and acceptance criteria
- Add appropriate labels (type, component, priority)

## Development Workflow

### Branch Naming Convention

Create a feature branch from `main`:

```bash
git checkout -b <type>/<brief-description>
```

**Branch types:**
- `feature/` - New features or capabilities
- `fix/` - Bug fixes
- `hotfix/` - Critical bugs in production
- `enhancement/` - Improvements to existing features
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

**Examples:**
```bash
git checkout -b feature/auto-recalculate-prices
git checkout -b fix/condition-discount-calculation
git checkout -b enhancement/pricing-performance
```

### Making Changes

1. **Write clean code**
   - Follow existing code style and patterns
   - Use meaningful variable/function names
   - Keep functions small and focused
   - Add comments only for complex logic

2. **Write tests**
   - Add unit tests for new functions
   - Add integration tests for API endpoints
   - Add E2E tests for critical user flows
   - Ensure all tests pass: `npm test`

3. **Update documentation**
   - Update README if needed
   - Update API documentation for new endpoints
   - Update wiki for architecture changes
   - Add inline code documentation

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)

**Examples:**
```bash
git commit -m "feat(pricing): add condition curve calculations"
git commit -m "fix(api): correct submission validation logic"
git commit -m "docs(wiki): update pricing strategy documentation"
```

**Good commit message:**
```
feat(seller-site): add real-time quote updates

Implement WebSocket connection for instant quote updates
when seller changes condition grades. Includes fallback
to polling for older browsers.

Closes #123
```

### Pull Request Process

#### 1. Prepare Your PR

Before creating a PR:

```bash
# Ensure your branch is up to date
git fetch origin
git rebase origin/main

# Run all checks
npm run lint
npm run type-check
npm test
npm run build

# Push your branch
git push origin feature/your-feature
```

#### 2. Create the PR

```bash
# Using GitHub CLI (recommended)
gh pr create --title "feat(seller-site): add real-time quotes" --body "Description..."

# Or via GitHub web interface
```

**PR Requirements:**
- Title follows commit convention: `<type>(<scope>): <description>`
- Description uses the PR template
- Links to related issue(s): `Closes #123` or `Relates to #456`
- All CI checks pass
- No merge conflicts
- Includes tests for new functionality
- Documentation updated if needed

#### 3. PR Template Checklist

Every PR must include:

```markdown
## Related Issue
Closes #123

## Description
Brief description of what this PR does and why

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How to test these changes:
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented if unavoidable)
- [ ] CI/CD checks pass
```

#### 4. Code Review

- Respond to review comments promptly
- Make requested changes in new commits (don't force push during review)
- Mark conversations as resolved after addressing
- Request re-review after making changes

#### 5. Merge

After approval:
- Ensure all checks pass
- Squash commits if requested
- Merge using "Squash and merge" or "Rebase and merge"
- Delete branch after merge

## Code Style Guidelines

### General Principles

- **DRY (Don't Repeat Yourself)**: Extract common logic into reusable functions
- **KISS (Keep It Simple, Stupid)**: Prefer simple solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until needed
- **Single Responsibility**: Each function/class should do one thing well

### TypeScript / JavaScript

```typescript
// Good: Clear, typed, and focused
interface QuoteRequest {
  releaseId: string;
  mediaCondition: Condition;
  sleeveCondition: Condition;
}

async function calculateQuote(request: QuoteRequest): Promise<Quote> {
  const marketData = await fetchMarketData(request.releaseId);
  const policy = await getPricingPolicy();
  return applyPricingPolicy(marketData, policy, request);
}

// Bad: Unclear, untyped, doing too much
function doStuff(data: any) {
  // Complex logic without clear purpose
  // Multiple responsibilities
  // No type safety
}
```

### File Organization

```
src/
├── components/          # React components
│   ├── seller/         # Seller site components
│   ├── storefront/     # Buyer storefront components
│   └── admin/          # Admin console components
├── services/           # Business logic
├── api/                # API routes and controllers
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── tests/              # Test files
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `pricing-engine.ts`)
- **Components**: `PascalCase.tsx` (e.g., `QuoteCalculator.tsx`)
- **Functions**: `camelCase` (e.g., `calculateQuote`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_QUOTE_AGE`)
- **Interfaces/Types**: `PascalCase` (e.g., `PricingPolicy`)

## Testing Guidelines

### Test Coverage

Aim for:
- 80%+ overall code coverage
- 100% coverage for critical paths (pricing, payments, inventory)
- All happy paths tested
- Major error cases tested

### Test Structure

```typescript
describe('PricingEngine', () => {
  describe('calculateBuyPrice', () => {
    it('should calculate correct price for Mint condition', () => {
      // Arrange
      const marketData = { median: 100 };
      const policy = { buyPercentage: 0.55 };
      const condition = { media: 'Mint', sleeve: 'NM' };

      // Act
      const price = calculateBuyPrice(marketData, policy, condition);

      // Assert
      expect(price).toBe(66); // 100 * 0.55 * 1.2 (Mint) * 1.0 (NM)
    });

    it('should handle missing market data', () => {
      // Test error case
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test pricing-engine.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Issue Labels Guide

Use labels to categorize your issues and PRs:

### Required Labels

Every issue must have:
1. **Type** (exactly one):
   - `type: feature` - New feature
   - `type: enhancement` - Improvement
   - `type: bug` - Defect
   - `type: documentation` - Docs update

2. **Component** (one or more):
   - `component: seller-site`
   - `component: buyer-storefront`
   - `component: admin-console`
   - `component: pricing-engine`
   - `component: api`
   - `component: database`
   - `component: integrations`
   - `component: infrastructure`

3. **Priority** (exactly one):
   - `priority: critical` - Blocks release
   - `priority: high` - Important
   - `priority: medium` - Normal
   - `priority: low` - Nice to have

### Optional Labels

- **Domain**: `domain: pricing`, `domain: inventory`, etc.
- **Effort**: `effort: xs`, `effort: s`, `effort: m`, `effort: l`, `effort: xl`
- **Status**: `status: blocked`, `status: needs-info`, etc.
- **Special**: `good-first-issue`, `help-wanted`, `breaking-change`, `security`

## Communication Guidelines

### GitHub Discussions

Use [Discussions](https://github.com/Badbeats87/site-oul-2/discussions) for:
- Asking questions about usage or implementation
- Proposing ideas before creating issues
- Sharing knowledge and tips
- General project discussion

**Don't use Discussions for:**
- Bug reports (use Issues)
- Feature requests (use Issues with template)

### Issue Comments

- Be clear and concise
- Provide context and examples
- Reference related issues/PRs
- Use markdown for formatting
- Add screenshots for visual issues

### PR Comments

- Be constructive and respectful
- Explain the "why" behind suggestions
- Offer alternatives when possible
- Approve when satisfied, don't block on nitpicks

## Project-Specific Guidelines

### Pricing Engine

The pricing engine is critical. Extra care required:
- All changes require review from pricing specialist
- 100% test coverage mandatory
- Pricing calculations must be deterministic
- Log all price calculations for audit trail
- Version pricing policies

### Database Migrations

Database changes need special attention:
- Always create a migration, never manual changes
- Test migrations on copy of production data
- Migrations must be reversible
- Review by database specialist required
- No data loss migrations without approval

### External API Integrations

When working with Discogs, eBay, or other APIs:
- Respect rate limits
- Implement proper error handling
- Cache responses when appropriate
- Log API calls for debugging
- Handle API changes gracefully

### Security

Security is paramount:
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Validate all user input
- Use parameterized queries (no SQL injection)
- Follow OWASP guidelines
- Report security issues privately to maintainers

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backwards compatible
- **Patch** (0.0.1): Bug fixes, backwards compatible

### Release Workflow

1. Create release branch: `release/v1.2.0`
2. Update version in `package.json`
3. Update CHANGELOG.md
4. Create release PR
5. After merge, tag release: `git tag v1.2.0`
6. Deploy to staging for validation
7. Deploy to production
8. Create GitHub release with notes

## Getting Help

### Resources

- **Documentation**: Check [README](../README.md) and [Wiki](https://github.com/Badbeats87/site-oul-2/wiki)
- **Product Spec**: See [product.md](../product.md)
- **Workflow**: See [AGILE.md](../AGILE.md)
- **Setup Guide**: See [GitHub Setup Guide](GITHUB_SETUP_GUIDE.md)

### Ask for Help

- **Questions**: Use [GitHub Discussions](https://github.com/Badbeats87/site-oul-2/discussions)
- **Bugs**: Open an [Issue](https://github.com/Badbeats87/site-oul-2/issues)
- **Ideas**: Start a [Discussion](https://github.com/Badbeats87/site-oul-2/discussions) in Ideas category

### Mentorship

New contributors:
- Look for `good-first-issue` label
- Ask questions in Discussions
- Request help from maintainers
- Pair program if available

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome diverse perspectives
- Give and accept constructive feedback
- Focus on what's best for the project
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information
- Other unprofessional conduct

### Enforcement

Maintainers will:
- Remove, edit, or reject comments/commits/issues that violate standards
- Ban temporarily or permanently for inappropriate behavior

Report violations to project maintainers.

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Recognized in project documentation
- Invited to team discussions

## Thank You!

Every contribution helps make Vinyl Catalog System better. We appreciate your time and effort!

For questions or suggestions about this guide, open an issue or discussion.

Happy coding!
