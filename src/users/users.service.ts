import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async onModuleInit(): Promise<void> {
    await this.migrateGoogleIdIndex();
  }

  /**
   * googleId used to be required, so existing databases have a unique, non-sparse
   * googleId_1 index. That index allows only one user without googleId, which breaks
   * every magic-link signup after the first. Mongoose doesn't change existing indexes,
   * so replace it with a unique + sparse one. No-op once migrated.
   */
  private async migrateGoogleIdIndex(): Promise<void> {
    try {
      const indexes = await this.userModel.collection.indexes();
      const index = indexes.find((i) => i.name === 'googleId_1');
      if (!index || index.sparse) return;

      await this.userModel.collection.dropIndex('googleId_1');
      await this.userModel.collection.createIndex(
        { googleId: 1 },
        { name: 'googleId_1', unique: true, sparse: true },
      );
      this.logger.log('Migrated googleId_1 index to unique + sparse');
    } catch (error) {
      this.logger.error('Failed to migrate googleId_1 index', error as Error);
    }
  }

  async findOrCreate(profile: Profile): Promise<UserDocument> {
    const { id, emails, displayName, photos } = profile;
    const email = emails && emails.length > 0 ? emails[0].value : '';
    const picture = photos && photos.length > 0 ? photos[0].value : undefined;

    const user = await this.userModel.findOne({ googleId: id }).exec();
    if (user) {
      return user;
    }

    const newUser = new this.userModel({
      googleId: id,
      email,
      displayName,
      picture,
    });
    return newUser.save();
  }

  async findOrCreateByEmail(rawEmail: string): Promise<UserDocument> {
    const email = rawEmail.trim().toLowerCase();

    const user = await this.userModel.findOne({ email }).exec();
    if (user) {
      return user;
    }

    return new this.userModel({
      email,
      displayName: email.split('@')[0],
    }).save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
}
