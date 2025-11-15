# Production Deployment Guide

Step-by-step guide for deploying the Website Analytics Platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- Linux server (Ubuntu 20.04+ recommended) or cloud VM
- Docker 24+ and Docker Compose 2+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- 2GB+ RAM, 2+ CPU cores
- 20GB+ storage

### Recommended Cloud Services

- **Database:** MongoDB Atlas (free tier available)
- **Cache:** Redis Cloud, AWS ElastiCache, or DigitalOcean Managed Redis
- **Hosting:** DigitalOcean, AWS EC2, Google Cloud Compute, or Hetzner
- **CDN:** Cloudflare (free tier includes DDoS protection)

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/website-analytics.git
cd website-analytics
```

### 2. Configure Environment

```bash
cp .env.production .env
nano .env
```

Update these critical values:

```env
# Database (MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics

# Redis (managed Redis URL)
REDIS_URL=redis://:password@redis-host:6379

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-32-byte-random-secret
NEXTAUTH_URL=https://your-domain.com

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Set Up SSL Certificates

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Option A: Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# Option B: Self-signed (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem
```

### 4. Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app

# Test health endpoint
curl https://your-domain.com/api/health
```

### 6. Access Dashboard

Navigate to `https://your-domain.com` and sign in with Google OAuth.

---

## Detailed Setup

### MongoDB Setup

#### Option 1: MongoDB Atlas (Recommended)

1. Create account at https://cloud.mongodb.com
2. Create a new cluster (free M0 tier available)
3. Add IP whitelist: `0.0.0.0/0` (or restrict to your server IP)
4. Create database user with read/write permissions
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/analytics`

#### Option 2: Self-Hosted MongoDB

```yaml
# docker-compose.prod.yml already includes MongoDB
# Configure in .env:
MONGODB_URI=mongodb://admin:password@mongodb:27017/analytics?authSource=admin
```

Create indexes:

```bash
docker-compose -f docker-compose.prod.yml exec app npm run db:indexes
```

Or manually:

```javascript
// Connect to MongoDB
db.events.createIndex({ site_id: 1, timestamp: -1 });
db.events.createIndex({ site_id: 1, session_id: 1 });
db.events.createIndex({ site_id: 1, visitor_id: 1 });
db.events.createIndex({ processed_at: 1 });

db.dailystats.createIndex({ site_id: 1, date: -1 });
db.dailystats.createIndex({ date: 1 });

db.sessions.createIndex({ site_id: 1, started_at: -1 });
db.sessions.createIndex({ session_id: 1 }, { unique: true });
```

### Redis Setup

#### Option 1: Managed Redis (Recommended)

**Redis Cloud:**
1. Sign up at https://redis.com/try-free/
2. Create database
3. Get connection URL: `redis://:password@endpoint:port`

**AWS ElastiCache:**
```bash
# Create ElastiCache cluster via AWS Console
# Security group: allow port 6379 from your server
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
```

#### Option 2: Self-Hosted Redis

```yaml
# Already configured in docker-compose.prod.yml
# Set password in .env:
REDIS_PASSWORD=your-secure-password
```

### Nginx Configuration

#### Update Domain

Edit `nginx/nginx.conf`:

```nginx
server_name your-domain.com www.your-domain.com;
```

#### SSL Certificate Paths

```nginx
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

#### Rate Limiting Adjustment

For high-traffic sites, increase limits:

```nginx
limit_req_zone $binary_remote_addr zone=event_limit:10m rate=5000r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=500r/s;
```

### Worker Scaling

Adjust concurrency based on traffic:

```env
# .env
QUEUE_CONCURRENCY=20  # Default: good for 1M events/day
BATCH_SIZE=100        # Increase for higher throughput
```

For high volume (10M+ events/day):

```yaml
# docker-compose.prod.yml
worker:
  deploy:
    replicas: 3
  environment:
    QUEUE_CONCURRENCY: 50
    BATCH_SIZE: 200
```

---

## Cloud Deployment

### DigitalOcean Droplet

1. Create Droplet (Ubuntu 22.04, 2GB RAM)
2. SSH into server
3. Install Docker:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

4. Follow Quick Start steps

### AWS EC2

1. Launch EC2 instance (t3.small or larger)
2. Security Group rules:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
3. Attach Elastic IP
4. Follow Quick Start steps

### Google Cloud Run

For serverless deployment:

```bash
# Build image
docker build -f Dockerfile.prod -t gcr.io/PROJECT_ID/analytics:latest .

# Push to Google Container Registry
docker push gcr.io/PROJECT_ID/analytics:latest

# Deploy
gcloud run deploy analytics \
  --image gcr.io/PROJECT_ID/analytics:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars MONGODB_URI=...,REDIS_URL=...
```

### Kubernetes

Example deployment:

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics
  template:
    metadata:
      labels:
        app: analytics
    spec:
      containers:
      - name: app
        image: your-registry/analytics:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: analytics-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: analytics-service
spec:
  selector:
    app: analytics
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Basic health
curl https://your-domain.com/api/health

# Detailed status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail=100 app
```

### Log Aggregation

**Using Docker logs:**

```bash
# App logs
docker-compose -f docker-compose.prod.yml logs -f app

# Worker logs
docker-compose -f docker-compose.prod.yml logs -f worker

# All services
docker-compose -f docker-compose.prod.yml logs -f
```

**Export to file:**

```bash
docker-compose -f docker-compose.prod.yml logs --no-color > logs.txt
```

### Metrics & Observability

Enable OpenTelemetry (Phase 3, Task 5 - coming soon):

```env
ENABLE_METRICS=true
METRICS_PORT=9090
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY
```

### Database Backup

**MongoDB Atlas:**
- Automatic backups enabled by default
- Configure in cluster settings

**Self-Hosted:**

```bash
# Backup
docker-compose -f docker-compose.prod.yml exec mongodb \
  mongodump --authenticationDatabase admin -u admin -p password \
  --out /backup

# Restore
docker-compose -f docker-compose.prod.yml exec mongodb \
  mongorestore --authenticationDatabase admin -u admin -p password \
  /backup
```

### SSL Certificate Renewal

```bash
# Auto-renew with cron (runs daily)
echo "0 0 * * * root certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml exec nginx nginx -s reload" | sudo tee -a /etc/crontab
```

### Updates & Rollback

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Rolling update (zero downtime)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build app

# Rollback
docker-compose -f docker-compose.prod.yml down
git checkout previous-commit
docker-compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Common Issues

#### 1. "MongoDB connection failed"

**Check:**
- MongoDB URI format: `mongodb+srv://user:pass@host/database`
- IP whitelist on MongoDB Atlas
- Network connectivity: `ping mongodb-host`

**Fix:**
```bash
# Test connection
docker-compose -f docker-compose.prod.yml exec app node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected!')).catch(console.error);
"
```

#### 2. "Redis connection timeout"

**Check:**
- Redis URL format: `redis://:password@host:port`
- Redis server running: `docker-compose ps redis`
- Password correct in .env

**Fix:**
```bash
# Test Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
# Should return: PONG
```

#### 3. "502 Bad Gateway"

**Check:**
- App container running: `docker-compose ps app`
- App logs: `docker-compose logs app`
- Nginx upstream configuration

**Fix:**
```bash
# Restart app
docker-compose -f docker-compose.prod.yml restart app

# Check Nginx config
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

#### 4. "Queue backup / High latency"

**Symptoms:**
- Events delayed by minutes
- Queue pending count increasing

**Fix:**
```bash
# Scale workers
docker-compose -f docker-compose.prod.yml up -d --scale worker=3

# Increase concurrency in .env
QUEUE_CONCURRENCY=50
docker-compose -f docker-compose.prod.yml restart worker
```

#### 5. "High memory usage"

**Fix:**
```bash
# Check memory
docker stats

# Reduce batch size
BATCH_SIZE=50
QUEUE_CONCURRENCY=10

# Add swap (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
ANALYTICS_DEBUG=true
```

Restart services:

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Performance Tuning

**Database:**
- Ensure indexes are created (see MongoDB Setup)
- Use connection pooling (configured by default)
- Enable MongoDB profiling for slow queries

**Redis:**
- Use persistence (RDB + AOF) for reliability
- Monitor memory usage
- Set maxmemory policy: `maxmemory-policy allkeys-lru`

**Worker:**
- Increase concurrency for CPU-bound tasks
- Increase batch size for I/O-bound tasks
- Monitor queue metrics

---

## Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] Strong passwords for MongoDB and Redis
- [ ] NEXTAUTH_SECRET is cryptographically random (32+ bytes)
- [ ] API keys rotated regularly
- [ ] IP whitelist on MongoDB Atlas
- [ ] Rate limiting enabled (Nginx)
- [ ] CORS configured for allowed origins only
- [ ] Google OAuth restricted to your domain
- [ ] Firewall rules: allow only 22, 80, 443
- [ ] Regular security updates: `apt update && apt upgrade`
- [ ] Backups automated and tested
- [ ] Monitoring and alerts configured

---

## Production Checklist

- [ ] Environment variables configured in .env
- [ ] SSL certificates valid and trusted
- [ ] MongoDB indexes created
- [ ] Redis persistence enabled
- [ ] Health checks passing
- [ ] Logs aggregating properly
- [ ] Backups scheduled
- [ ] Monitoring dashboards set up
- [ ] Rate limits appropriate for traffic
- [ ] Worker concurrency tuned
- [ ] Domain DNS pointing to server
- [ ] Google OAuth configured
- [ ] Test event ingestion
- [ ] Test dashboard access
- [ ] Load testing completed

---

## Support

For deployment support:
- Documentation: https://github.com/your-repo/docs
- Issues: https://github.com/your-repo/issues
- Community: https://discord.gg/your-server
