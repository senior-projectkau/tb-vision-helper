# TB Detection API

This is the Express/Node.js API that runs your ONNX TB detection model.

## Deployment Options

### Option 1: Railway (Recommended - Free)
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Set environment variables:
   - `SUPABASE_URL`: https://fxndgbdmgvfheucntkbi.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY`: (from your Supabase settings)
5. Railway will auto-deploy and give you a URL

### Option 2: Render
1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy

### Option 3: Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch
fly secrets set SUPABASE_URL=https://fxndgbdmgvfheucntkbi.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
fly deploy
```

## Local Development

```bash
cd express-api
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

## Testing

```bash
curl http://localhost:8000/health
```

## After Deployment

Copy your deployed API URL (e.g., `https://your-app.railway.app`) and use it in your Supabase edge function.
