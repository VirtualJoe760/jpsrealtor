# JPSRealtor CMS

This is a Payload CMS project for managing JPSRealtor content.

## Getting Started

1. Copy `.env.example` to `.env` and configure your environment variables
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3001/admin](http://localhost:3001/admin)

## Important Notes

- This CMS runs on port 3001 (main Next.js app runs on 3000)
- Uses a separate MongoDB database from the main application
- Completely self-contained in the `/cms` directory
