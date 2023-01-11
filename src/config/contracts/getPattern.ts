import * as fs from 'fs';
import * as path from 'path';

/**
 * Returns { name, abi, bytecode } matching the input
 */
export function getPattern(name: string) {
  if (!name) throw new Error('getPattern(name) : missing name argument.');
  name = name.trim().toLowerCase();

  try {
    const abiPath = path.join(__dirname, '..', '..', '..', 'contracts', 'compiled', name, 'abi.json');
    const bytecodePath = path.join(__dirname, '..', '..', '..', 'contracts', 'compiled', name, 'bytecode.json');

    const abi = JSON.parse(fs.readFileSync(abiPath, { encoding: 'utf-8' }));
    const bytecode = JSON.parse(fs.readFileSync(bytecodePath, { encoding: 'utf-8' }));

    return { name, abi, bytecode };
  } catch (e) {
    throw new Error(`No pattern available for contract with name ${name}.`);
  }
}
