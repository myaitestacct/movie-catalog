export async function fetchMovies(params) {
  const res = await fetch(`${BASE_URL}/api/movies.php?${params}`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${BASE_URL}/api/stats.php`);
  return res.json();
}
