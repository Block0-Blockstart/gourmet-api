# Gourmet API

## Pre-configured wallet and contract used for the proof of concept

### Admin Wallet (used to deploy Notarization contract)

This wallet has already been funded with some MATIC tokens on the Mumbai testnet.

```
Owner private key:  <contact us to get this key, not published on this public repo>
Owner address:      0xd1eC880B70E1b46Dd11F38a3624eb4f83B4BC15D
```

### Notarization Contract

```
Notarization Contract Address: 0x3e1e14844775Cb58Df6C1dbc43947cFD6f447709
```

### NFT Contract

```
NFT Contract Address: 0xaD5798AA8aDbcae1BA7E2Da3EcA90F551FbD34A4
```

This admin address notarization contract and nft contract can be used for testing/demos but a new wallet and a new contract should be created in production.

## Deployments

:warning:

The whole pre-installation is already done and the application can be launched as-is, with the current values provided in environment variables.

**So you can skip this section, unless if you want to completely reboot the installation, which you should for production.**

On the first deployment or for reinstalling from scratch, the system requires some initial setup:

- An admin wallet
- A deployed notarization contract
- A deployed NFT contract

Some scripts are provided to help this pre-installation process.

1. **Create wallet**

This script outputs a new generated wallet.

```bash
$ node scripts/create-wallet

output:
{
  wallet: {
    address: '0x....',
    publicKey: '0x....',
    mnemonic: 'fatigue gown pitch august ...',
    privateKey: '0x....'
  }
}
```

Run the script and **copy the private key in a text file**.  
On your machine, create a text file and paste the private key like this:

```
ADMIN_KEY=0x....
```

The key will be used to deploy the notarization and NFT contract.

2. **Create an account on Alchemy**

You can sign up on alchemy: https://www.alchemy.com/. <br>
And retrieve a rpc url with an API key for either the mumbai testnet or the polygon mainnet.

3. **Deploy the notarization contract**

The following script requires two arguments.

- privateKey: it is the ADMIN_KEY that we have generated.
- provider: it is the url to connect to a node using JSON-RPC. For the Polygon testnet, this url is `https://polygon-mumbai.g.alchemy.com/v2/<YOUR_ALCHEMY_API_KEY>`

```bash
$ node scripts/deploy-notarization --privateKey <your-ADMIN_KEY> --provider <blockchain-entry-point>

output:
 "Contract address: 0x...."
```

Run the script and save the address in your text file like this:

```
NOTARIZATION_CONTRACT_ADDRESS = 0x....
```

4. **Deploy the nft contract**
   The following script requires two arguments.

- privateKey: it is the ADMIN_KEY that we have generated.
- provider: it is the url to connect to a node using JSON-RPC. For the Polygon testnet, this url is `https://polygon-mumbai.g.alchemy.com/v2/<YOUR_ALCHEMY_API_KEY>`

```bash
$ node scripts/deploy-notarization --privateKey <your-ADMIN_KEY> --provider <blockchain-entry-point>

output:
 "Contract address: 0x...."
```

Run the script and save the address in your text file like this:

```
NFT_CONTRACT_ADDRESS = 0x....
```

5. **Setup the environment variables**

Open the file at project root named `.env.dev` (for development) an/or the `.env.prod` (for production).  
Just copy/paste your text file content inside the desired env file (replace pre-existing values if you don't need them anymore).

6. **Fund the admin wallet**

Because Polygon is a blockchain where you need to pay gas fees for the transactions, the admin wallet used needs to be funded with the blockchain's native token "MATIC". <br>
On the testnet you can easily fund your admin wallet with fake tokens here: https://faucet.polygon.technology/. <br>
On the mainnet, these tokens needs to be purchased on the open market.

## Environment variables

`API_PORT`: number           
The port to access this API.          
**Required**          
Example: 42010


`WITH_SWAGGER`: "yes" or anything else          
If set to "yes", a swagger UI will be available at this url: *your-deploy-domain:your-api-port/api*            
**Default: "no"**


`MINTER_KEY`: string                  
A custom key that can be used to access minting and read features on the API           
**Optional**            
If not set, minting features are not available (read features may still be accessed using the READER_KEY).               
If set, ADMIN_KEY should also be set.               


`READER_KEY`: string                  
A custom key that can be used to access only read features on the API           
**Optional**            
If set, user may read data using this key.                    
If not set, user may still read data using MINTER_KEY if this one is set.                       
If neither READER_KEY nor MINTER_KEY are set, read features are not available.


`ADMIN_KEY`: string               
The ethereum private key of the admin. The admin must be the owner of the deployed contracts.                
The private key must be prefixed with "0x"       
**Optional**          
If not set, minting features are not available.                       
App will throw if MINTER_KEY is defined but not ADMIN_KEY.               
App will throw if ADMIN_KEY does not match the contracts' owner.


`ADMIN_ADDRESS`: string                       
The ethereum address that is the owner of deployed contracts.              
If ADMIN_KEY is defined, the address must match the this key.                  
**Required**          
The private key must be prefixed with "0x"


`BLOCKCHAIN_RPC_URL_PORT`: url of a RPC node or url of a chain provider service. For RPC node, the port must be included.                       
**Required**          
Examples:           
- Your custom RPC node: *http://my-node-url:42001*
- A typical local Ganache: *http://127.0.0.1:7545*
- An external chain provider: *https://polygon-mumbai.g.alchemy.com/v2/\<YOUR_API_KEY\>*


`NOTARIZATION_CONTRACT_ADDRESS`: string                    
The ethereum address of the deployed Notarization contract.                  
**Required**          
The private key must be prefixed with "0x"


`NFT_CONTRACT_ADDRESS`: string                    
The ethereum address of the deployed NFT contract.                  
**Required**          
The private key must be prefixed with "0x"


## Running the app in dev mode

You need to install the packages:

```bash
$ npm install
```

Then launch the app:

```bash
# without watch mode
$ npm run start

# watch mode
$ npm run start:dev
```

## Running the app in prod mode

There is no real production mode as this project is a proof of concept.

Just run:

```bash
$ npm run start:prod
```

# Contact

**block0**

- info@block0.io
- [https://block0.io/](https://block0.io/)

# License

This repository is released under the [MIT License](https://opensource.org/licenses/MIT).