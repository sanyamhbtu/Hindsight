const formData = new FormData();
formData.append('datasetName', 'test_audit');
formData.append('data', new Blob(['Phil texted at 11:47pm: We are at Caesars. Doug is with us. Everything is fine.'], { type: 'text/plain' }), 'payload.txt');

fetch('https://tenant-7fb4c266-ceb0-4afc-b48d-d586bdefff8b.aws.cognee.ai/api/v1/add', {
  method: 'POST',
  headers: {
    'X-Api-Key': '8466cda73bacb374ff6c0534549acf30093f30f3695b383078d554e7f1c30cb0'
  },
  body: formData
}).then(async r => {
  console.log(r.status, r.statusText);
  console.log(await r.text());
}).catch(console.error);
