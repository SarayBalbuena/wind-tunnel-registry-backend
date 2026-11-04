import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
