export const POSTER_GRADIENTS = [
  ["#2E2A24", "#E8A33D"],
  ["#1F2A2E", "#4FA9A2"],
  ["#2A1F26", "#C1443A"],
  ["#1E232E", "#5C7CBF"],
  ["#26241F", "#B7A15A"],
  ["#231F2E", "#8D6FC9"],
  ["#1F2621", "#6FA05C"],
  ["#2E1F21", "#D8756B"],
];

export const GENRES = ["All", "Drama", "Noir", "Sci-Fi", "Documentary", "Thriller"];

export const MOVIE_POOL = [
  { title: "Static Horizon", year: 2019, rating: 8.1, genre: "Sci-Fi", runtime: 118, seeders: 214, watched: true, cached: true, language: "English" },
  { title: "The Long Winter Room", year: 2021, rating: 7.4, genre: "Drama", runtime: 104, seeders: 88, watched: false, cached: false, language: "Swedish" },
  { title: "Nightglass", year: 2016, rating: 8.6, genre: "Noir", runtime: 96, seeders: 340, watched: false, cached: true, language: "English" },
  { title: "Salt & Tide", year: 2023, rating: 6.9, genre: "Documentary", runtime: 87, seeders: 52, watched: false, cached: false, language: "Portuguese" },
  { title: "Low Frequency", year: 2020, rating: 7.8, genre: "Thriller", runtime: 121, seeders: 176, watched: true, cached: true, language: "English" },
  { title: "Marfa Static", year: 2018, rating: 7.2, genre: "Drama", runtime: 109, seeders: 61, watched: false, cached: false, language: "English" },
  { title: "The Quiet Machine", year: 2022, rating: 8.3, genre: "Sci-Fi", runtime: 133, seeders: 298, watched: false, cached: false, language: "Japanese" },
  { title: "Amber Route", year: 2017, rating: 6.5, genre: "Noir", runtime: 99, seeders: 40, watched: false, cached: false, language: "French" },
  { title: "Field Recordings", year: 2024, rating: 7.9, genre: "Documentary", runtime: 92, seeders: 121, watched: true, cached: true, language: "English" },
  { title: "Second Reel", year: 2015, rating: 8.0, genre: "Thriller", runtime: 114, seeders: 205, watched: false, cached: false, language: "German" },
  { title: "Cold Aperture", year: 2021, rating: 7.1, genre: "Drama", runtime: 101, seeders: 73, watched: false, cached: false, language: "English" },
  { title: "The Last Splice", year: 2019, rating: 8.5, genre: "Noir", runtime: 108, seeders: 267, watched: false, cached: false, language: "Italian" },
];

export function withIds(list, offset) {
  return list.map((m, i) => ({
    ...m,
    id: offset + i,
    grad: POSTER_GRADIENTS[(offset + i) % POSTER_GRADIENTS.length],
  }));
}
