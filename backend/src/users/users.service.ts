import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // Fetches the user together with the (normally hidden) refresh token hash.
  // Used only by AuthService when validating a refresh token.
  async findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.hashedRefreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  async create(dto: CreateUserDto & { passwordHash: string }): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const user = this.usersRepository.create({
      email: dto.email,
      passwordHash: dto.passwordHash,
      username:dto.username,
      firstName:dto.firstName,
      lastName:dto.lastName,
      avatarUrl: dto.avatarUrl,
    });

    return this.usersRepository.save(user);
  }

  async setRefreshTokenHash(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { hashedRefreshToken });
  }

  async findOrCreateFromGoogle(googleUser: {
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    fullName?: string;
    avatarUrl?: string | null;
    googleId: string;
  }): Promise<User> {
    // 1. First check if user is already linked with this googleId
    let existing = await this.usersRepository.findOne({ where: { googleId: googleUser.googleId } });

    // 2. Otherwise match by email
    if (!existing && googleUser.email) {
      existing = await this.findByEmail(googleUser.email);
    }

    if (existing) {
      let needsSave = false;
      if (!existing.googleId) {
        existing.googleId = googleUser.googleId;
        needsSave = true;
      }
      if (!existing.firstName && googleUser.firstName) {
        existing.firstName = googleUser.firstName;
        needsSave = true;
      }
      if (!existing.lastName && googleUser.lastName) {
        existing.lastName = googleUser.lastName;
        needsSave = true;
      }
      if (!existing.username) {
        existing.username = googleUser.username || googleUser.email.split('@')[0];
        needsSave = true;
      }
      if (!existing.avatarUrl && googleUser.avatarUrl) {
        existing.avatarUrl = googleUser.avatarUrl;
        needsSave = true;
      }
      if (needsSave) {
        await this.usersRepository.save(existing);
      }
      return existing;
    }

    const firstName = googleUser.firstName || 'User';
    const lastName = googleUser.lastName || 'Google';
    let baseUsername = (googleUser.username || (googleUser.email ? googleUser.email.split('@')[0] : 'user')).replace(/[^a-zA-Z0-9_]/g, '');
    if (!baseUsername) baseUsername = 'user';
    let username = baseUsername.slice(0, 15);

    // Check if username is already taken, if so append random digits
    let userWithSameName = await this.findByUsername(username);
    while (userWithSameName) {
      username = `${baseUsername.slice(0, 10)}${Math.floor(Math.random() * 9000) + 1000}`;
      userWithSameName = await this.findByUsername(username);
    }

    const user = this.usersRepository.create({
      email: googleUser.email,
      firstName,
      lastName,
      username,
      avatarUrl: googleUser.avatarUrl ?? undefined,
      googleId: googleUser.googleId,
      isEmailVerified: true,
    });
    return this.usersRepository.save(user);
  }

  async findOrCreateFromFortyTwo(fortyTwoUser: {
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    fullName?: string;
    avatarUrl?: string | null;
    fortyTwoId: string;
  }): Promise<User> {
    // 1. First check if user is already linked with this fortyTwoId
    let existing = await this.usersRepository.findOne({ where: { fortyTwoId: fortyTwoUser.fortyTwoId } });

    // 2. Otherwise match by email if provided
    if (!existing && fortyTwoUser.email) {
      existing = await this.findByEmail(fortyTwoUser.email);
    }

    // 3. Otherwise match by username if provided
    if (!existing && fortyTwoUser.username) {
      existing = await this.findByUsername(fortyTwoUser.username);
    }

    if (existing) {
      let needsSave = false;
      if (!existing.fortyTwoId) {
        existing.fortyTwoId = fortyTwoUser.fortyTwoId;
        needsSave = true;
      }
      if (!existing.firstName && fortyTwoUser.firstName) {
        existing.firstName = fortyTwoUser.firstName;
        needsSave = true;
      }
      if (!existing.lastName && fortyTwoUser.lastName) {
        existing.lastName = fortyTwoUser.lastName;
        needsSave = true;
      }
      if (!existing.username) {
        existing.username = fortyTwoUser.username || (fortyTwoUser.email ? fortyTwoUser.email.split('@')[0] : '42user');
        needsSave = true;
      }
      if (!existing.avatarUrl && fortyTwoUser.avatarUrl) {
        existing.avatarUrl = fortyTwoUser.avatarUrl;
        needsSave = true;
      }
      if (needsSave) {
        await this.usersRepository.save(existing);
      }
      return existing;
    }

    const firstName = fortyTwoUser.firstName || 'User';
    const lastName = fortyTwoUser.lastName || '42';
    let baseUsername = (fortyTwoUser.username || (fortyTwoUser.email ? fortyTwoUser.email.split('@')[0] : '42user')).replace(/[^a-zA-Z0-9_]/g, '');
    if (!baseUsername) baseUsername = '42user';
    let username = baseUsername.slice(0, 15);

    let userWithSameName = await this.findByUsername(username);
    while (userWithSameName) {
      username = `${baseUsername.slice(0, 10)}${Math.floor(Math.random() * 9000) + 1000}`;
      userWithSameName = await this.findByUsername(username);
    }

    const user = this.usersRepository.create({
      email: fortyTwoUser.email || `${username}@student.42.fr`,
      firstName,
      lastName,
      username,
      avatarUrl: fortyTwoUser.avatarUrl ?? undefined,
      fortyTwoId: fortyTwoUser.fortyTwoId,
      isEmailVerified: true,
    });
    return this.usersRepository.save(user);
  }
  async findByEmailVerificationTokenHash(hash: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.emailVerificationTokenHash')
      .where('user.emailVerificationTokenHash = :hash', { hash })
      .getOne();
  }
  
  async setEmailVerificationToken(userId: string, hash: string | null): Promise<void> {
    await this.usersRepository.update(userId, { emailVerificationTokenHash: hash });
  }
  
  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      isEmailVerified: true,
      emailVerificationTokenHash: null,
    });
  }
  
  async findByResetTokenHash(hash: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordTokenHash')
      .where('user.resetPasswordTokenHash = :hash', { hash })
      .getOne();
  }
  
  async setResetToken(userId: string, hash: string | null, expires: Date | null): Promise<void> {
    await this.usersRepository.update(userId, {
      resetPasswordTokenHash: hash,
      resetPasswordExpires: expires,
    });
  }
  
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(userId, {
      passwordHash,
      resetPasswordTokenHash: null,
      resetPasswordExpires: null,
    });
  }
  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findByIdOrThrow(userId);

    // Validate duplicate username if changed
    if (dto.username && dto.username !== user.username) {
      const existingUser = await this.findByUsername(dto.username);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(`Username "${dto.username}" is already taken. Please choose another.`);
      }
    }

    // Validate duplicate email if changed
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(`Email "${dto.email}" is already in use by another account.`);
      }
    }

    const { fullName, password, profilePictureUrl, ...fields } = dto;
    const updateData: Partial<User> = { ...fields };

    if (profilePictureUrl && !updateData.avatarUrl) {
      updateData.avatarUrl = profilePictureUrl;
    }

    if (password && password.trim().length >= 8) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (fullName && !updateData.firstName && !updateData.lastName) {
      const parts = fullName.trim().split(' ');
      updateData.firstName = parts[0];
      updateData.lastName = parts.slice(1).join(' ') || '';
    }

    try {
      await this.usersRepository.update(userId, updateData);
    } catch (err: any) {
      if (err?.code === '23505') {
        if (err?.detail?.includes('username')) {
          throw new ConflictException('This username is already taken. Please choose another.');
        }
        if (err?.detail?.includes('email')) {
          throw new ConflictException('This email is already registered to another account.');
        }
        throw new ConflictException('A user with these details already exists.');
      }
      throw err;
    }

    return this.findByIdOrThrow(userId);
  }

  async getPublicProfile(targetUserId: string, requestingUserId: string) {
    const user = await this.findByIdOrThrow(targetUserId);
    const isOwner = targetUserId === requestingUserId;
  
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      ...(isOwner ? { email: user.email, preferredLanguage: user.preferredLanguage } : {}), // only present at all if it's you
    };
  }
  
  async listUsers(): Promise<{ id: string; username: string | null }[]> {
    const users = await this.usersRepository.find();
    return users.map(({ id, username }) => ({ id, username: username ?? null }));
  }
}

