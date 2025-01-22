The Reserve Bank of Australia (RBA) publishes historical data including [exchange rates](https://www.rba.gov.au/statistics/historical-data.html#exchange-rates). 

Unfortunately, the data is in CSV format and not structured well making it difficult to use. This package provides functions to fetch, parse, cache and query the data returning a JSON object.

## Notes

The RBA provides:
- A$1 exchange rates for the following currencies:
  - USD	CNY	JPY	EUR	KRW	GBP	SGD	INR	THB	NZD	TWD	MYR	IDR	VND	AED	PGK	HKD	CAD	ZAR	CHF	PHP	SDR
- Daily exchange rates dating back to January 2023.

Monthly exhange rates are calculated as the average of the daily rates for the month.

## Installation

```
npm install rba-exchange-rates
```
or
```
yarn add rba-exchange-rates
```

## Usage

Data for all currencies:
```
import rba from 'rba-exchange-rates';

const rates = await rba.rates('USD');
console.log(rates);
```

All data for a specific currency:
```
const rates = await rba.rates('USD');
console.log(rates);
```

Exchange rate for a specific date:
```
const rate = await rba.rate('USD', '2023-01-03');
console.log(rate);
```

Exchange rate (avg) for a specific month:
```
const rate = await rba.rate('USD', '2023-01');
console.log(rate);
```

## Dependencies
No dependencies.

## License
MIT