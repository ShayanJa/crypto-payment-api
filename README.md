# Shayanja - Crypto Payment Component

A modern, production-ready React component for accepting cryptocurrency payments. Built with TypeScript, React, and Express.

![Crypto Payment Demo](./demo.gif)

## Features

- 🔒 Secure cryptocurrency payments (ETH, BTC)
- ⚡ Real-time payment monitoring
- 🎨 Modern, responsive UI with Tailwind CSS
- 📱 Mobile-friendly QR code scanning
- ⏱️ Payment expiry management
- 🔄 Automatic exchange rate updates
- 🪝 Webhook support for payment notifications

## Quick Start

```bash
npm install @shayanja/crypto-payment
```

```tsx
import { CryptoPayment } from '@shayanja/crypto-payment';

function App() {
  return (
    <CryptoPayment
      amount={99.99}
      currency="USD"
      supportedCurrencies={['ETH', 'BTC']}
      onPaymentComplete={(txHash) => console.log('Payment complete:', txHash)}
    />
  );
}
```

## Environment Variables

```env
MONGODB_URI=your_mongodb_uri
ETHERSCAN_API_KEY=your_etherscan_api_key
VITE_COINGECKO_API_KEY=your_coingecko_api_key
ETHEREUM_MNEMONIC=your_ethereum_mnemonic
```

## Server Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run all
```

## Component Props

| Prop | Type | Description |
|------|------|-------------|
| amount | number | Payment amount |
| currency | string | Base currency (default: 'USD') |
| supportedCurrencies | Array<'ETH' \| 'BTC'> | Accepted cryptocurrencies |
| onPaymentComplete | (txHash: string) => void | Payment success callback |
| onPaymentError | (error: Error) => void | Payment error callback |
| description | string | Optional payment description |

## Webhook Integration

The server sends webhook notifications for payment status updates. Configure your webhook URL when creating a payment:

```typescript
const payment = await createPayment({
  amount: 99.99,
  currency: 'ETH',
  webhookUrl: 'https://your-server.com/webhook'
});
```

## Security Considerations

- Never store private keys in the frontend
- Use environment variables for sensitive data
- Implement rate limiting for API endpoints
- Validate all user inputs
- Monitor for suspicious activities

## Production Deployment

1. Build the frontend:
```bash
npm run build
```

2. Deploy the server:
```bash
docker build -t crypto-payment-server .
docker run -p 3000:3000 crypto-payment-server
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- Documentation: [docs.shayanja.com](https://docs.shayanja.com)
- Issues: [GitHub Issues](https://github.com/shayanja/crypto-payment/issues)
- Email: support@shayanja.com