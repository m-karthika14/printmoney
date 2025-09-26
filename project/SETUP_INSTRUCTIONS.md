# Project Setup Instructions

## Prerequisites
- Node.js (LTS version recommended)
- npm (comes with Node.js)

## Installation Steps

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Install the LTS version
   - Restart your terminal/PowerShell after installation

2. **Install Dependencies**
   ```powershell
   npm install
   ```

3. **Start Development Server**
   ```powershell
   npm run dev
   ```

4. **Open in Browser**
   - The project will run on `http://localhost:5173`
   - Your OnboardingWizard will be accessible at this URL

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Features

Your OnboardingWizard includes:
- ✅ 6-step onboarding process
- ✅ Plan selection and payment processing
- ✅ Agent installation guidance
- ✅ Printer detection and configuration
- ✅ Pricing setup
- ✅ Service selection
- ✅ Complete review and database save

## Troubleshooting

If you encounter any issues:
1. Make sure Node.js is installed: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall: `rm -rf node_modules && npm install`