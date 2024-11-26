# 🚀 Crypto Payment API

A robust, open source, production-ready API for processing cryptocurrency payments. Built with Express, TypeScript, and blockchain technology.
Simply Run the backend with your own mnemonic and you're ready to go!
The Server will use unique derivation paths with your mnemonic which you can use to access your payments.

## 🔧 Installation

1. **Clone the Repository**:

## 🔥 Getting Started

1. **Install Dependencies**:

Use the derivation paths and the mnemonic to retrieve your payemnts

Use in tandum with
[React Component](https://www.npmjs.com/package/@shayanja/react-crypto-payment)

## ✨ Features

- 💰 **Multi-Currency Support**

  - ETH (Ethereum)
  - Easily extensible for more cryptocurrencies

- 🔒 **Security First**

  - HD Wallet implementation
  - Unique payment addresses for each transaction
  - Secure key derivation
  - No private keys stored on server

- 🔄 **Real-Time Processing**

  - Automatic payment detection
  - Configurable confirmation thresholds
  - Webhook notifications
  - Payment expiry management

- 🛠 **Developer Friendly**
  - RESTful API design
  - Comprehensive error handling
  - TypeScript support
  - Swagger documentation
  - Docker support

## 🚦 API Endpoints

### Create Payment

```http
POST /api/payment/create
```

```json
{
  "amount": 0.1,
  "currency": "ETH",
  "webhookUrl": "https://your-server.com/webhook",
  "expiresIn": 30
}
```

### Check Payment Status

```http
POST /api/payment/check
```

```json
{
  "address": "0x...",
  "currency": "ETH",
  "expectedAmount": 0.1
}
```

## 🛠 Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/crypto-payment-api
cd crypto-payment-api
```

2. **Set up environment variables**

```bash
cp .env.template .env
```

Required variables:

```env
ETHERSCAN_API_KEY=your_etherscan_api_key
ETHEREUM_MNEMONIC=your_secure_mnemonic
CHAIN_ID=sepolia
UNIQUE_PATHS_NUMS=1000
```

3. **Install dependencies**

```bash
npm install
```

4. **Start the server**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 🐳 Docker Deployment

1. **Build and run with Docker Compose**

```bash
docker-compose up -d
```

2. **Single container deployment**

```bash
docker build -t crypto-payment-api .
docker run -p 3000:3000 crypto-payment-api
```

## 🔧 Configuration

### Payment Settings

- `UNIQUE_PATHS_NUMS`: Number of unique derivation paths (default: 1000)
- `CHAIN_ID`: Ethereum network (mainnet, sepolia, etc.)

### Blockchain Monitoring

- Payment confirmation threshold: 1 confirmation
- Payment expiry check: Every 5 minutes
- Transaction monitoring: Every minute

## 🪝 Webhook Events

```typescript
// Payment Completed
{
  status: "completed",
  address: "0x...",
  currency: "ETH",
  txHash: "0x...",
  confirmations: 1,
  timestamp: "2024-03-10T12:00:00Z"
}

// Payment Expired
{
  status: "expired",
  address: "0x...",
  currency: "ETH",
  timestamp: "2024-03-10T12:00:00Z"
}
```

## 🔒 Security Best Practices

1. **Environment Variables**

   - Never commit `.env` files
   - Use strong mnemonics
   - Rotate API keys regularly

2. **Payment Processing**

   - Unique address per payment
   - Automatic payment expiry
   - Confirmation thresholds

3. **API Security**
   - Rate limiting
   - Input validation
   - CORS configuration

## 📦 Project Structure

```
src/
├── server/
│   ├── models/      # Database models
│   ├── routes/      # API endpoints
│   ├── services/    # Business logic
│   └── utils/       # Helper functions
```

## 📝 License

MIT © [Shayan Talebi]

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📫 Support

- Documentation: [docs.example.com](https://docs.example.com)
- Issues: [GitHub Issues](https://github.com/yourusername/crypto-payment-api/issues)
- Email: support@example.com

## ⭐️ Show your support

Give a ⭐️ if this project helped you!
