/* eslint-disable @typescript-eslint/no-var-requires */
const ethers = require('ethers');
const minimist = require('minimist');
const { getPattern, hasArray } = require('./utils');

async function main() {
  const { privateKey, provider } = minimist(process.argv.slice(2), {
    string: ['privateKey', 'provider'],
  });

  if (!privateKey || !provider) throw new Error('Missing arg. Require provider, privateKey.');
  // arg received twice or more
  if (hasArray([privateKey, provider])) throw new Error('One or more args are duplicated.');

  const wallet = new ethers.Wallet(privateKey, new ethers.providers.JsonRpcProvider(provider));
  const { abi, bytecode } = getPattern('notarization');
  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await contractFactory.deploy();
  await contract.deployTransaction.wait(); // wait txReceipt before ending function

  console.log(`Contract address: ${contract.address}`);
  return contract.address;
}

main();
