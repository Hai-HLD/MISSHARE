# MIS SHARE - Cloudflare Workers Deployment Guide

This guide will help you deploy the MIS SHARE application using Cloudflare Workers instead of the .NET API.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install the Cloudflare Workers CLI
3. **D1 Database**: Your D1 database should already be set up with the name "MISSHAREDB"

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for you to authenticate with Cloudflare.

## Step 3: Configure Your Worker

1. **Update the wrangler.toml file** with your actual values:
   - Replace `your-subdomain` in the worker name with your preferred subdomain
   - Ensure the `database_id` matches your D1 database ID

2. **Set environment variables** (optional, for production):
```bash
wrangler secret put JWT_SECRET
wrangler secret put JWT_ISSUER
wrangler secret put JWT_AUDIENCE
wrangler secret put JWT_EXPIRY_HOURS
```

## Step 4: Deploy the Worker

```bash
# Deploy to production
wrangler deploy

# Or deploy to a preview environment first
wrangler deploy --env staging
```

## Step 5: Update Frontend Configuration

After deployment, update the API URL in `scripts/api.js`:

```javascript
getApiBaseUrl() {
    // Replace with your actual worker URL
    return 'https://misshare-api.your-subdomain.workers.dev/api';
}
```

## Step 6: Test the Deployment

1. **Test D1 Connection**:
   ```bash
   curl https://misshare-api.your-subdomain.workers.dev/api/test/d1-connection
   ```

2. **Test Authentication**:
   ```bash
   curl -X POST https://misshare-api.your-subdomain.workers.dev/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Test","lastName":"User","email":"test@example.com","cwid":"12345678","password":"testpassword123"}'
   ```

## Step 7: Update CORS (if needed)

If you encounter CORS issues, you can update the CORS headers in `src/index.js`:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-frontend-domain.com', // Replace with your frontend domain
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Environment Management

### Development
```bash
wrangler dev
```

### Staging
```bash
wrangler deploy --env staging
```

### Production
```bash
wrangler deploy
```

## Monitoring and Logs

- **View logs**: `wrangler tail`
- **Monitor performance**: Check the Cloudflare dashboard
- **Debug issues**: Use `wrangler dev` for local development

## Database Management

Your D1 database is already configured and bound to the worker. You can:

- **Query the database**: Use the D1 dashboard in Cloudflare
- **Run migrations**: Use `wrangler d1 execute`
- **Backup data**: Export from the D1 dashboard

## Security Considerations

1. **JWT Secret**: Use a strong, random secret for production
2. **CORS**: Restrict origins to your actual frontend domains
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Input Validation**: The current implementation includes basic validation

## Troubleshooting

### Common Issues

1. **CORS Errors**: Update the CORS headers in `src/index.js`
2. **Database Connection**: Verify your D1 database ID in `wrangler.toml`
3. **Authentication Issues**: Check JWT secret configuration
4. **Deployment Failures**: Check your Cloudflare account limits

### Debug Commands

```bash
# Check worker status
wrangler whoami

# View worker details
wrangler deployments list

# Test locally
wrangler dev --local

# View logs
wrangler tail --format=pretty
```

## Performance Optimization

1. **Caching**: Consider implementing response caching for frequently accessed data
2. **Compression**: Enable gzip compression in Cloudflare dashboard
3. **CDN**: Your worker automatically benefits from Cloudflare's global CDN

## Cost Considerations

- **Workers**: Free tier includes 100,000 requests per day
- **D1**: Free tier includes 5GB storage and 25M read/write operations
- **Bandwidth**: Free tier includes 1GB per month

## Next Steps

1. Set up a custom domain for your worker
2. Implement monitoring and alerting
3. Set up automated deployments with GitHub Actions
4. Consider implementing rate limiting and additional security measures

## Support

- **Cloudflare Workers Docs**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)
- **D1 Database Docs**: [developers.cloudflare.com/d1](https://developers.cloudflare.com/d1)
- **Wrangler CLI Docs**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler)
