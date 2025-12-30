# NomadWallet

A self-custodial Bitcoin wallet for Android with Nostr protocol integration.

## Features

- **Bitcoin-only wallet** using Bitcoin Dev Kit (BDK)
- **Nostr protocol integration** for decentralized communication
- **NomadServer protocol** for wallet state synchronization
- **Self-custodial** - You control your keys
- **Open source** - Fully transparent code
- **Android-first** - Optimized for Android 7.0+ (API 24+)

## Technology Stack

### Core Bitcoin
- `bdk-rn` - Bitcoin Dev Kit for React Native
- `@react-native-async-storage/async-storage` - Secure local storage
- `react-native-fs` - File system access

### Nostr Protocol
- `nostr-tools` - Nostr protocol implementation
- `@noble/secp256k1` - Cryptographic operations
- `@scure/base` - Encoding utilities
- `react-native-get-random-values` - Secure randomness

### UI & Navigation
- `@react-navigation/native` - Navigation framework
- `react-native-vector-icons` - Icon library
- `react-native-qrcode-svg` - QR code generation
- `react-native-vision-camera` - Camera for QR scanning

## Project Structure

```
src/
├── services/
│   ├── wallet/          # BDK wallet management
│   ├── nostr/           # Nostr client & NomadServer protocol
│   └── storage/         # Secure key storage
├── screens/
│   ├── Setup/           # First-run wallet creation
│   ├── Home/            # Main wallet screen
│   ├── Send/            # Send Bitcoin
│   ├── Receive/         # Receive Bitcoin
│   └── Settings/        # App settings
├── components/
│   ├── common/          # Reusable UI components
│   └── wallet/          # Wallet-specific components
├── types/
│   ├── wallet.ts        # BDK & Bitcoin types
│   ├── nostr.ts         # Nostr protocol types
│   └── nomadserver.ts # Server protocol types
├── utils/
│   └── constants.ts     # App constants
└── assets/              # Images, fonts
```

## Setup

### Prerequisites

- Node.js >= 18
- npm >= 8
- Android Studio
- Android SDK (API 24+)
- Java Development Kit (JDK) 17

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nomad-wallet
```

2. Install dependencies:
```bash
npm install
```

3. Install Android dependencies:
```bash
cd android && ./gradlew clean
```

### Running the App

#### Android

```bash
npm run android
```

Or open the `android` folder in Android Studio and run from there.

#### Metro Bundler

```bash
npm start
```

## Development

### TypeScript

The project uses TypeScript with strict mode enabled. Type definitions are located in `src/types/`.

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run tsc
```

## Security

- Private keys are stored encrypted in secure storage
- Mnemonic phrases are never sent over the network
- All Bitcoin operations happen on-device
- Nostr keys are generated securely using proper entropy

## NomadServer Protocol

NomadServer is a protocol for synchronizing Bitcoin wallet state over Nostr relays. It allows:

- Encrypted wallet state backup
- Multi-device synchronization
- Privacy-preserving balance updates
- Transaction coordination

## Roadmap

- [x] Basic project setup
- [ ] BDK wallet integration
- [ ] Nostr client implementation
- [ ] NomadServer protocol
- [ ] QR code scanning
- [ ] Transaction history
- [ ] Lightning Network support (future)
- [ ] iOS support (future)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Disclaimer

This is experimental software. Use at your own risk. Always backup your mnemonic phrase securely.

## Support

For issues and questions, please open a GitHub issue.

