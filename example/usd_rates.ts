import { rba } from '../src/rates';

async function main() {
  const rates = await rba.rates('USD');
  console.log(rates);
}

main();