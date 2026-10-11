# GoCollabo Render Deployment

## Quick Deployment Guide

### 1. Prerequisites
- Supabase project with Authentication configured
- Render account (free tier available)
- Git repository with GoCollabo code

### 2. Environment Variables Setup

#### Required Variables for Render:
```
VITE_APP_URL=https://your-app.onrender.com
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
NODE_ENV=production
```

#### Optional Variables:
```
GEMINI_API_KEY=your-gemini-api-key          # For AI features
VITE_GOOGLE_MAPS_API_KEY=your-maps-key     # For location features
```

### 3. Supabase Configuration (Critical)

**In Supabase Dashboard → Authentication → URL Configuration:**

1. **Site URL**: `https://your-app.onrender.com`
2. **Redirect URLs** (add all that apply):
   - `https://your-app.onrender.com` (production)
   - `https://your-app.onrender.com/auth/callback` (if using OAuth)
   - `http://localhost:3000` (local development)

### 4. Deploy to Render

#### Method A: Using Render Blueprint (Recommended)
1. Push `render.yaml` to your repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New +" → "Blueprint"
4. Connect your repository
5. Render will auto-detect and deploy

#### Method B: Manual Setup
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Name**: `gocollabo` (or your preferred name)
   - **Region**: `Oregon` (or closest to your users)
   - **Branch**: `main`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: `Starter` (free tier)

### 5. Post-Deployment Verification

#### Check Email Confirmation Flow:
1. Visit your deployed app
2. Click "Sign Up" and create an account
3. Check your email for confirmation link
4. Click link - should redirect to your deployed app
5. Sign in with the confirmed account

#### Test Authentication Flows:
- [ ] User signup
- [ ] Email confirmation
- [ ] Password reset
- [ ] User login/logout
- [ ] Session persistence

#### Test Application Features:
- [ ] Dashboard loads
- [ ] Deep links work (e.g., `/projects/123`)
- [ ] API calls succeed
- [ ] Static assets load
- [ ] SPA routing works

### 6. Troubleshooting

#### Email Confirmations Redirect to Localhost
1. Check `VITE_APP_URL` is set in Render environment
2. Verify Supabase Auth → URL Configuration
3. Clear browser cache and test in incognito

#### 404 Errors on Page Refresh
This is normal for SPAs - Render serves `index.html` for all unknown routes

#### API/Health Check Fails
1. Check server logs in Render dashboard
2. Verify environment variables are set
3. Test locally with `NODE_ENV=production`

#### Build Failures
1. Check Node.js version compatibility (requires Node 18+)
2. Verify all dependencies install correctly
3. Check for memory limits (Render has 512MB free tier)

### 7. Monitoring

#### Render Dashboard:
- Check "Metrics" tab for CPU/Memory usage
- Monitor "Logs" for errors
- Watch "Events" for deployments

#### Supabase Dashboard:
- Monitor Authentication events
- Check Database performance
- Review API usage

### 8. Custom Domain (Optional)

If using a custom domain:
1. Add domain in Render → Settings → Custom Domain
2. Update `VITE_APP_URL` to your custom domain
3. Update Supabase Auth → URL Configuration
4. Configure DNS as instructed by Render

### 9. Maintenance

#### Regular Checks:
- Monitor Render service health
- Check Supabase quota usage
- Review error logs weekly
- Test auth flows monthly

#### Scaling Considerations:
- Starter plan: Up to 750 hours/month free
- Upgrade to Standard plan for 24/7 uptime
- Consider database connection pooling if needed

---

## Security Notes

⚠️ **Never commit secrets to git**
- All API keys should be in Render environment variables
- `.env` file is in `.gitignore` for safety

🔒 **Environment Variables Security**:
- `VITE_` variables are exposed to browser
- `GEMINI_API_KEY` is server-only (not exposed)
- Supabase keys are safe for browser exposure

---

## Support

For deployment issues:
1. Check Render documentation: https://render.com/docs
2. Check Supabase documentation: https://supabase.com/docs
3. Review application logs in Render dashboard

For application issues:
1. Check test suite: `pnpm test`
2. Run type check: `pnpm check`
3. Test locally: `pnpm dev`