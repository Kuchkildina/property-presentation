# Property Presentation Generator

Generates luxury property presentations for clients. Three input modes:
- **Manual** — fill in property details by hand
- **Upload** — upload developer brochure PDF + price list
- **URL** — paste developer website link

Output: 7-slide presentation preview + downloadable HTML file (print to PDF via browser).

---

## Deploy to Vercel (10 minutes)

### Step 1 — GitHub
1. Create a new repository on github.com
2. Upload all these files (drag & drop the folder)
3. Commit

### Step 2 — Vercel
1. Go to vercel.com → New Project
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Click **Environment Variables** → Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from console.anthropic.com
5. Click **Deploy**

Done. Vercel gives you a URL like `https://property-presentation-xyz.vercel.app`

---

## Run locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000

---

## How the PDF download works

The "Download for print" button saves an `.html` file. To convert to PDF:
1. Open the file in Chrome or Safari
2. File → Print (Cmd+P / Ctrl+P)  
3. Destination → **Save as PDF**
4. Set margins to **None**, enable **Background graphics**
5. Save

Each slide fills one A4/Letter page.

---

## Customisation

- **Branding**: edit `globals.css` to change fonts/colours
- **Slide structure**: edit the prompt in `src/app/api/generate/route.js`
- **Add your logo**: place `logo.png` in `/public` and add `<img src="/logo.png">` to the cover slide in `downloadHTML()` in `page.js`
