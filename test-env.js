import http from 'node:http';

http.get('http://localhost:3000/api/check-policies', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', data);
  });
}).on('error', (err) => {
  console.error('Error hitting check-policies:', err.message);
});
