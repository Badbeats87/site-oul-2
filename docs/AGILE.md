# Agile Workflow - Vinyl Catalog

This document outlines the agile development workflow for the Vinyl Catalog project using GitHub Issues and Projects.

## Overview

The project uses GitHub Issues to track work items and GitHub Projects for sprint planning. All work is organized into:
- **Epics**: Large features spanning multiple issues
- **Features**: User-facing capabilities
- **Enhancements**: Improvements to existing functionality
- **Bugs**: Defects that need fixing

## GitHub Repository

**Repository**: Create new

### Key Resources
- **Issues**: 
- **Pull Requests**: 

## Issue Labels

Labels are used to categorize and prioritize work:

### Category Labels
- **feature**: New feature or capability
- **enhancement**: Improvement to existing functionality
- **bug**: Defect that needs fixing
- **documentation**: Documentation updates

### Domain Labels
- **pricing**: Pricing strategy and discount related
- **backend**: Backend/server changes
- **frontend**: Frontend/UI changes
- **database**: Database schema or migrations

### Status Labels
- **completed**: Work is fully completed
- **in-progress**: Currently being worked on
- **backlog**: Future work or enhancement ideas

### Priority Labels
- **high-priority**: Critical path items (address first)
- **medium-priority**: Important but not urgent
- **low-priority**: Nice to have / future consideration

## Issue Workflow

### Creating an Issue

When creating an issue:
1. Use a descriptive title (e.g., "Feature: Auto-recalculate prices on condition change")
2. Add a detailed description with:
   - Current behavior (if applicable)
   - Expected behavior
   - Implementation details
   - Related files/components
3. Assign appropriate labels
4. Link to related issues if applicable

### Issue States

```
BACKLOG → IN PROGRESS → REVIEW → COMPLETED
   ↑                                    |
   └────────────────────────────────────┘
         (if changes needed)
```

### Transitions

**Backlog → In Progress**
- Move issue to "In Progress" when starting work
- Update the issue with status comments
- Create a feature branch from `master`

**In Progress → Review**
- Create a Pull Request linked to the issue
- PR must reference the issue (e.g., "Closes #123")
- Request review from team members

**Review → Completed**
- Merge PR to `master` after approval
- Close the issue automatically (via PR merge)
- Delete feature branch

## Pull Request Workflow

### Branch Naming

Create feature branches with this naming convention:
```
feature/brief-description
fix/brief-description
enhancement/brief-description
```

Example:
```
feature/auto-recalculate-prices
fix/condition-discount-calculation
enhancement/pricing-performance
```

### PR Requirements

Every PR must:
1. Reference the related issue (#issue-number)
2. Have a descriptive title
3. Include a summary of changes
4. List any breaking changes
5. Have tests updated/added
6. Pass all CI checks

### PR Template

```markdown
## Related Issue
Closes #123

## Description
Brief description of what this PR does

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How to test these changes

## Checklist
- [ ] Code follows project style
- [ ] Tests updated/added
- [ ] Documentation updated
- [ ] No breaking changes
```

## Sprint Planning

### Sprint Cycle
- **Sprint Length**: 2 weeks
- **Sprint Planning**: Monday 10:00 AM
- **Sprint Review**: Friday 5:00 PM
- **Retrospective**: Friday 6:00 PM

### Sprint Capacity Planning

1. Estimate effort on each issue (S, M, L, XL)
2. Select issues for the sprint based on:
   - Priority labels
   - Dependencies
   - Team capacity
3. Move selected issues to current sprint project
4. Update team members with sprint goals

## Current Status

### Completed (v1.0)
- ✅ Separate media/sleeve conditions support
- ✅ Separate buy/sell pricing discounts per condition tier
- ✅ Admin UI for condition discount configuration
- ✅ eBay marketplace integration
- ✅ Currency configuration

### In Progress
- 🔄 Auto-recalculate prices when conditions change
- 🔄 Apply condition adjustments to fallback pricing

### Backlog
- Performance optimization for large inventory
- Advanced reporting and analytics dashboard
- Reverb.com marketplace integration

## Prioritization Framework

### Priority Matrix
```
         Effort
         Low    Med    High
Impact ┌──────┬──────┬──────┐
High   │ DO!! │ PLAN │ PLAN │
       ├──────┼──────┼──────┤
Med    │ NICE │ PLAN │ EVAL │
       ├──────┼──────┼──────┤
Low    │ SKIP │ SKIP │ SKIP │
       └──────┴──────┴──────┘
```

- **DO!!**: High impact, low effort → Do immediately
- **PLAN**: Moderate effort, worth doing → Plan for sprint
- **EVAL**: High effort → Evaluate ROI before starting
- **NICE**: Low impact → Do if time allows
- **SKIP**: Not worth the effort → Don't do

## Best Practices

### Issue Management
- ✅ Use labels consistently
- ✅ Link related issues
- ✅ Update issue status regularly
- ✅ Close completed issues immediately
- ✅ Leave implementation notes for future reference

### Code Quality
- ✅ Write descriptive commit messages
- ✅ Keep PRs small and focused
- ✅ Test before submitting PR
- ✅ Request review from relevant team members
- ✅ Address review feedback promptly

### Documentation
- ✅ Update code comments when needed
- ✅ Keep README current
- ✅ Document major changes in CHANGELOG
- ✅ Add API documentation for new endpoints

## Tools & Commands

### Useful GitHub CLI Commands

List all issues:
```bash
gh issue list
```

Create an issue:
```bash
gh issue create --title "Feature: ..." --body "Description"
```

List issues by label:
```bash
gh issue list --label "pricing"
```

View issue details:
```bash
gh issue view 1
```

Add labels to issue:
```bash
gh issue edit 1 --add-label "high-priority,backend"
```

### Git Workflow

Create and switch to feature branch:
```bash
git checkout -b feature/auto-recalculate-prices
```

Push branch and create PR:
```bash
git push -u origin feature/auto-recalculate-prices
gh pr create --title "Feature: Auto-recalculate prices" --body "Description"
```

## Questions?

- Check existing issues: https://github.com/Badbeats87/vinyl-catalog/issues
- Review project board: https://github.com/Badbeats87/vinyl-catalog/projects
- Contact team leads for clarification
