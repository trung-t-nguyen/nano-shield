This is a [Next.js](https://nextjs.org) demo app for [mini-guard](../../README.md).

## Getting Started

### Using published mini-guard

```bash
npm install
npm run dev
```

### Using local mini-guard build

Run this once from the **mini-guard root** to build and register the package locally:

```bash
npm run link:setup
```

Then open two terminals:

```bash
# Terminal 1 — mini-guard root: rebuild on every save
npm run dev

# Terminal 2 — here (demo/mini-react): link local build + start Next.js
npm run dev:local
```

`dev:local` symlinks the local build into `node_modules/mini-guard` via `npm link`. After the first run the symlink persists, so subsequent `npm run dev` also uses the local build. Every save to mini-guard's `src/` triggers a rebuild; Next.js picks it up on the next page reload.

Open [http://localhost:3000](http://localhost:3000) to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
