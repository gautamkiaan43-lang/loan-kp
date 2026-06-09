async function main() {
  const query = "9 Falstaff Street, Highbury";
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;
  console.log("Fetching URL:", url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LMS-Geocoding-Debug/1.0'
      }
    });
    const data = await res.json();
    console.log("Nominatim Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
main();
