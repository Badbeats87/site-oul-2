# Contributing to Vinyl Catalog System

Thank you for your interest in contributing! This document provides guidelines for the development process.

## Development Workflow

See [AGILE.md](../AGILE.md) in the root directory for detailed workflow, branch naming conventions, and PR requirements.

### Quick Summary

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make changes**: Implement your feature or fix
3. **Test thoroughly**: Ensure all tests pass
4. **Create a PR**: Link to related issues using GitHub references
5. **Code review**: Address feedback from team members
6. **Merge**: Merge to `main` after approval

## Branch Naming

```
feature/brief-description     # New features
fix/brief-description         # Bug fixes
enhancement/brief-description # Improvements
```

Example: `feature/auto-recalculate-prices`

## Commit Messages

Write clear, descriptive commit messages:

```
Type: Brief description

Longer explanation of changes if needed.

Closes #123
```

Types: `feat`, `fix`, `enhancement`, `docs`, `test`, `refactor`

## Pull Request Process

Every PR must include:

1. **Title**: Descriptive and links issue (`Closes #123`)
2. **Description**: What problem does this solve?
3. **Changes**: Bullet list of what changed
4. **Testing**: How to test these changes
5. **Checklist**:
   - [ ] Code follows project style
   - [ ] Tests updated/added
   - [ ] Documentation updated
   - [ ] No breaking changes

See PR template in `.github/pull_request_template.md`

## Code Style

- Follow existing patterns in the codebase
- Use meaningful variable/function names
- Add comments for complex logic only
- Keep functions small and focused

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for reasonable coverage (not necessarily 100%)

## Questions?

- Check the README and product documentation
- Review existing issues and PRs
- Reach out to project maintainers

Thank you for contributing! 🎵
