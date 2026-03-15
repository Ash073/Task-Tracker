const CloudmersiveConvertApiClient = require('cloudmersive-convert-api-client');
const api = new CloudmersiveConvertApiClient.ConvertDataApi();
const methods = Object.keys(api);
console.log('Includes convertDataXlsxToJson:', methods.includes('convertDataXlsxToJson'));
console.log('Includes convertDataXlsToJson:', methods.includes('convertDataXlsToJson'));
console.log('All methods:', methods.join(', '));
