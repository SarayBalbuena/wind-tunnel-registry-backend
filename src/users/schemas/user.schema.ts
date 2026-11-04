import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ type: String })
  picture?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
