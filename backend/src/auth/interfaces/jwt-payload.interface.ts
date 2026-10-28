export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export interface JwtPayloadWithRefreshToken extends JwtPayload {
  refreshToken: string;
}
