# Vinyl Catalog System

A comprehensive platform for buying and selling used vinyl records, featuring:
- **Seller Site**: Submit vinyl for instant quotes
- **Buyer Storefront**: Browse and purchase vinyl records
- **Admin Console**: Manage submissions, inventory, and pricing
- **Intelligent Pricing Engine**: Dynamic pricing based on condition grades and market data

## Project Overview

The Vinyl Catalog System is a three-sided marketplace that:

1. **Buys** vinyl from collectors (Seller Site)
2. **Manages** inventory with condition-based pricing (Admin Console)
3. **Sells** records to customers (Buyer Storefront)

### Architecture

```
Seller Site <-> API <-> Catalog DB <-> Admin Console <-> API <-> Storefront
                             ^
                      Pricing Engine
```

## Key Features

### 🎵 Seller Site ("Sell to Us")
- Search catalog by artist, title, or barcode
- Real-time quote generation with instant condition-based pricing
- Media and sleeve condition grading (Mint through Good)
- Selling list cart management
- Seller submission with payout method selection

### 🎸 Buyer Storefront ("Buy from Us")
- Advanced filtering (genre, condition, price range)
- Product cards with stock status and pricing
- Shopping cart and checkout flow
- Wishlist functionality
- Recent price drop indicators

### ⚙️ Admin Console
- Submission queue management with review workflow
- Accept/counter/reject seller submissions
- Live inventory management with margin tracking
- Pricing policy creation and management
- Condition curve configuration
- Markdown scheduling for unsold items

### 💰 Intelligent Pricing Engine

**Condition Curves**: Separate adjustment percentages for media and sleeve condition
- Mint: 120% (media) / 110% (sleeve)
- Near Mint: 100% / 100%
- Very Good+: 75% / 75%
- Very Good: 60% / 50%
- Very Good-: 45% / 35%
- Good: 25% / 15%

**Buy Formula**:
```
Offer = Market Stat × Buy % × Media Adjustment × Sleeve Adjustment
```

**Sell Formula**:
```
List Price = Market Stat × Sell % × Media Adjustment × Sleeve Adjustment
```
(Subject to minimum profit margin requirements)

**Market Data Sources**:
- Discogs API integration
- eBay API integration
- Hybrid averaging (configurable per policy)
- Fallback pricing strategies

## Directory Structure

```
site-oul-2/
├── README.md                 # Project documentation
├── AGILE.md                 # Development workflow
├── product.md               # Product specification
├── mockups.html             # UI wireframes & mockups
├── Discogs.postman_collection.json    # Discogs API specs
├── Ebay.postman_collection.json       # eBay API specs
└── .gitignore              # Git ignore rules
```

## UI Mockups

The project includes interactive HTML mockups for all user interfaces:

**Open `mockups.html` in a browser to view:**

1. **Seller Site** - Record submission and quote flow
2. **Buyer Storefront** - Shopping and product discovery
3. **Admin Console** - Submission queue and dashboard
4. **Inventory Manager** - Catalog and stock management
5. **Pricing Policy Editor** - Configure dynamic pricing rules

Navigate between sections using the top navigation tabs.

## Development Workflow

### Documentation
- **[AGILE.md](./AGILE.md)** - Sprint planning, workflow, and team processes
- **[.github/GITHUB_SETUP_GUIDE.md](.github/GITHUB_SETUP_GUIDE.md)** - Complete GitHub setup instructions
- **[.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)** - Comprehensive contribution guidelines
- **[.github/QUICK_REFERENCE.md](.github/QUICK_REFERENCE.md)** - Quick command reference

### Quick Links
- **[Project Board](https://github.com/Badbeats87/site-oul-2/projects)** - Track work items and sprints
- **[Issues](https://github.com/Badbeats87/site-oul-2/issues)** - Bug reports and feature requests
- **[Discussions](https://github.com/Badbeats87/site-oul-2/discussions)** - Ask questions and share ideas
- **[Wiki](https://github.com/Badbeats87/site-oul-2/wiki)** - Detailed documentation

## Product Specification

See [product.md](./product.md) for detailed:
- System architecture and data models
- Pricing strategy and formulas
- Submission and inventory workflows
- Edge cases and operational considerations
- Open questions for kickoff

## API Integration

### External APIs

The system integrates with:
- **Discogs API**: Market price data and album metadata
- **eBay API**: Market comparables and sold listings
- Payment Provider: (TBD)
- Shipping Provider: (TBD)

See Postman collections for API specifications:
- `Discogs.postman_collection.json`
- `Ebay.postman_collection.json`

## Data Models

### Core Entities

- **Release**: Album metadata (title, artist, label, barcode, etc.)
- **Market Snapshot**: Price statistics from Discogs/eBay
- **Pricing Policy**: Rules for calculating buy/sell prices
- **Seller Submission**: Collection of items submitted for sale
- **Submission Item**: Individual record in a submission
- **Inventory Lot**: Record available on storefront

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- API keys for Discogs and eBay (development)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd site-oul-2

# Install dependencies (when backend setup begins)
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# View mockups
open mockups.html

# Start local development server
npm start

# Open in browser
http://localhost:3000
```

### Deployment

The application is configured for automatic deployment to Railway with GitHub integration.

**Live Application**:
- https://vinyl-catalog-prod.railway.app (after Railway setup)

**Setup Instructions**:
See **[RAILWAY_SETUP.md](./RAILWAY_SETUP.md)** for quick 5-minute setup guide.

**Full Deployment Documentation**:
See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive deployment information.

**How it works**:
- Every push to `main` branch automatically deploys
- Railway builds Docker image and deploys to production
- No manual deployment steps needed

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test thoroughly
3. Commit with descriptive message: `git commit -m "feat: add feature"`
4. Push to remote: `git push origin feature/your-feature`
5. Open a Pull Request

See [AGILE.md](./AGILE.md) for detailed workflow and branch naming conventions.

## Completed Features (v1.0)

- ✅ Separate media/sleeve conditions support
- ✅ Separate buy/sell pricing discounts per condition tier
- ✅ Admin UI for condition discount configuration
- ✅ eBay marketplace integration (API specs)
- ✅ Currency configuration framework
- ✅ UI mockups for all user interfaces
- ✅ Production-ready HTML/CSS pages for all interfaces
- ✅ Comprehensive admin console with pricing policies and inventory management
- ✅ Docker containerization for deployment
- ✅ Railway CI/CD integration with automatic GitHub deployment

## In Progress

- 🔄 Backend API development
- 🔄 Database schema and migrations
- 🔄 Auto-recalculate prices when conditions change
- 🔄 Apply condition adjustments to fallback pricing

## Planned Features

- Reverb.com marketplace integration
- Advanced reporting and analytics dashboard
- Performance optimization for large inventory
- Email/SMS notification system
- Admin bulk import/export tools
- Seller reputation system

## License

[To be determined]

## Questions?

- Review project docs: [product.md](./product.md), [AGILE.md](./AGILE.md)
- Check API specs: Postman collections
- Review UI mockups: `mockups.html`

## Project Status

🚀 **Frontend Complete** - Production-ready UI with admin console, pricing policies, and inventory management. Deployed to Railway with automatic GitHub CI/CD. Ready for backend API development.
