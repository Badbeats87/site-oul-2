#!/bin/bash

# GitHub Label Setup Script for Vinyl Catalog System
# This script creates all project labels with proper colors and descriptions

set -e

echo "Setting up GitHub labels for Vinyl Catalog System..."

# Type labels
echo "Creating type labels..."
gh label create "type: feature" -c "0e8a16" -d "New feature or capability" --force
gh label create "type: enhancement" -c "a2eeef" -d "Improvement to existing functionality" --force
gh label create "type: bug" -c "d73a4a" -d "Defect that needs fixing" --force
gh label create "type: hotfix" -c "b60205" -d "Critical bug requiring immediate fix" --force
gh label create "type: documentation" -c "0075ca" -d "Documentation updates" --force
gh label create "type: refactor" -c "fbca04" -d "Code refactoring" --force
gh label create "type: technical-debt" -c "e99695" -d "Technical debt or cleanup" --force

# Component labels
echo "Creating component labels..."
gh label create "component: seller-site" -c "c5def5" -d "Seller 'Sell to Us' site" --force
gh label create "component: buyer-storefront" -c "bfdadc" -d "Buyer 'Buy from Us' storefront" --force
gh label create "component: admin-console" -c "fef2c0" -d "Internal admin console" --force
gh label create "component: pricing-engine" -c "f9d0c4" -d "Pricing calculation and policies" --force
gh label create "component: api" -c "d4c5f9" -d "Backend API and services" --force
gh label create "component: database" -c "c2e0c6" -d "Database schema and migrations" --force
gh label create "component: integrations" -c "fad8c7" -d "External APIs (Discogs/eBay)" --force
gh label create "component: infrastructure" -c "bfd4f2" -d "DevOps and deployment" --force

# Domain labels
echo "Creating domain labels..."
gh label create "domain: pricing" -c "fbca04" -d "Pricing strategy" --force
gh label create "domain: inventory" -c "0e8a16" -d "Inventory management" --force
gh label create "domain: submissions" -c "1d76db" -d "Seller submissions" --force
gh label create "domain: catalog" -c "5319e7" -d "Catalog metadata" --force
gh label create "domain: checkout" -c "e99695" -d "Checkout and payment" --force
gh label create "domain: shipping" -c "f9d0c4" -d "Shipping and fulfillment" --force
gh label create "domain: notifications" -c "bfdadc" -d "Email/SMS notifications" --force
gh label create "domain: auth" -c "d93f0b" -d "Authentication" --force

# Priority labels
echo "Creating priority labels..."
gh label create "priority: critical" -c "b60205" -d "Critical, blocks release" --force
gh label create "priority: high" -c "d93f0b" -d "Important, next priority" --force
gh label create "priority: medium" -c "fbca04" -d "Normal priority" --force
gh label create "priority: low" -c "0e8a16" -d "Nice to have" --force

# Status labels
echo "Creating status labels..."
gh label create "status: blocked" -c "e99695" -d "Blocked by dependencies" --force
gh label create "status: needs-info" -c "d876e3" -d "Needs more information" --force
gh label create "status: ready" -c "0e8a16" -d "Ready to work on" --force
gh label create "status: needs-testing" -c "fbca04" -d "Needs QA/testing" --force
gh label create "status: needs-review" -c "c5def5" -d "Needs code review" --force
gh label create "status: wontfix" -c "ffffff" -d "Will not be fixed" --force
gh label create "status: duplicate" -c "cfd3d7" -d "Duplicate issue" --force

# Effort labels
echo "Creating effort labels..."
gh label create "effort: xs" -c "c2e0c6" -d "< 1 day" --force
gh label create "effort: s" -c "bfdadc" -d "1-2 days" --force
gh label create "effort: m" -c "fef2c0" -d "3-5 days" --force
gh label create "effort: l" -c "f9d0c4" -d "1-2 weeks" --force
gh label create "effort: xl" -c "e99695" -d "2+ weeks" --force

# Special labels
echo "Creating special labels..."
gh label create "good-first-issue" -c "7057ff" -d "Good for newcomers" --force
gh label create "help-wanted" -c "008672" -d "Extra attention needed" --force
gh label create "breaking-change" -c "d93f0b" -d "Breaks backward compatibility" --force
gh label create "security" -c "b60205" -d "Security-related" --force
gh label create "performance" -c "fbca04" -d "Performance improvement" --force
gh label create "accessibility" -c "0e8a16" -d "Accessibility improvement" --force
gh label create "epic" -c "3e4b9e" -d "Large multi-issue feature" --force

echo ""
echo "✓ All labels created successfully!"
echo ""
echo "Usage guidelines:"
echo "  - Every issue should have 1 type label (required)"
echo "  - Every issue should have 1+ component labels"
echo "  - Every issue should have 1 priority label (required)"
echo "  - Features should have 1 effort label"
echo ""
echo "Example: type: feature, component: seller-site, priority: high, effort: m"
