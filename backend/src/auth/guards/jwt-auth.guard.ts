import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects any route decorated with @UseGuards(JwtAuthGuard).
// This is the guard that "protected routes" rely on across the app,
// including the future ProjectOwnerGuard (Day 2) which will run after this.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
