// The subject requires: register/login user fields, a preferred language,
// and profile viewing rules where any user can view another user's profile
// picture + info, but the email address must stay private to the owner.

export const CURRENT_USER = {
  id: 1,
  username: "marajansen",
  firstName: "Mara",
  lastName: "Jansen",
  email: "mara.jansen@example.com",
  bio: "Night-shift projectionist. Mostly noir and static.",
  preferredLanguage: "English",
  joined: "2023",
  initials: "MJ",
  color: "#E8A33D",
};

export const OTHER_USERS = [
  {
    id: 2,
    username: "reelwatcher",
    firstName: "Theo",
    lastName: "Reel",
    bio: "35mm or nothing. Collects damaged prints.",
    joined: "2021",
    initials: "TR",
    color: "#4FA9A2",
  },
  {
    id: 3,
    username: "n.kade",
    firstName: "Nadia",
    lastName: "Kade",
    bio: "Documentary only. Will argue about runtime cuts.",
    joined: "2024",
    initials: "NK",
    color: "#C1443A",
  },
  {
    id: 4,
    username: "farrow_d",
    firstName: "Dana",
    lastName: "Farrow",
    bio: "Here for the sound design, honestly.",
    joined: "2022",
    initials: "DF",
    color: "#5C7CBF",
  },
];

export const ALL_USERS = [CURRENT_USER, ...OTHER_USERS];

export function getUserById(id) {
  return ALL_USERS.find((u) => u.id === id) || null;
}
